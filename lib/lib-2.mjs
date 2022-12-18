

export async function representUrlPagelet(callElem) {
  console.log('url', document.URL)
  let filePath = document.URL.match(/\?file=(\S+)(?:$)|(?:[\?\&])/)?.[1]
  if(filePath.endsWith('/'))
    filePath += 'index.escm'
  if(filePath) {
    let response = await fetch(filePath)
    if(response.ok) {
      const ext = extname(filePath)
      const dir = dirname(filePath) + '/'
      let content = await response.text()
      content = content.replaceAll('./', dir)
      renderContentTo(callElem, content, ext)
    } else {
      callElem.innerText = 'Could not find ' + filePath + ' bad url?'
    }
  } else {
    callElem.innerText = 'No file path given (use ?file=... in url)'
  }
}


// All of this originally from reconfuse's lib


export function dirname(filestr) {
  if(filestr === '.' || filestr === './')
    return '.'
  // else
  let dirmatch = filestr.match(/^\s*(.+?)\/[^\/]+\/?\s*$/) // "aaa/bbb/ccc.txt" -> ["aaa/bbb/ccc.txt", "aaa/bbb"]
  if(dirmatch?.[1]) // "aaa/bbb"
    return dirmatch[1]
  // else
  return undefined
}

export function extname(filestr) {
  let extmatch = filestr.match(/\.[^\.\/]+$/) // "aaa/bbb/ccc.txt" -> [".txt"]
  if(extmatch?.[0]) // ".txt"
    return extmatch?.[0]
  // else
  return undefined
}

/**
plaintextElement(tag, str)
Is equivalent to:
elementThen(tag, elem => elem.innerText = str)
eg:
plaintextElement('span', "Some span")
*/
export function plaintextElement(tag, str) {
  return elementThen(tag, elem => elem.innerText = str)
}

export function eventWith(type, obj = undefined) {
  const ret = new CustomEvent(type)
  if(obj !== undefined) for(const key in obj)
    ret[key] = obj[key]
  return ret
}

export function bubblingEventWith(type, obj = undefined) {
  const ret = new CustomEvent(type, {bubbles: true, composed: true})
  if(obj !== undefined) for(const key in obj)
    ret[key] = obj[key]
  return ret
}

export function notificationFrom(elem, message, opts = {}) {
  elem.dispatchEvent(bubblingEventWith('notification', {message: message, options: opts}))
}


/**
let x  = undefined
let xp = pollUntilDefined(() => x) // pending promise
xp // pending promise
x = 1
xp // 1
*/
export function pollUntilDefined(fn) {
  function poll(fn, res, steps = 0) {
    console.debug(`polling `, steps)
    let r = fn()
    if(r === undefined || r === null)
      setTimeout(() => poll(fn, res, steps+1), 100*steps)
    else
      res(r)
    // total time T is 50*steps*(steps-1) iirc; 1000 steps is ~1/2 day
  }
  return new Promise(res => {
    poll(fn, res)
  })
}

export let debugSimulateLatency = false
export async function dbgWait() {
  if(debugSimulateLatency) { 
    if(randomIntegerOn(0,1) === 0)
      return void 0
    else 
      return new Promise((res) => setTimeout(res, randomIntegerOn(1000, 2000)))
  }
}

export function writeAndThrow(...args) {
  console.error(...args)
  throw Error(String(args[0]))
}

export function elementThen(tag, fn) {
  const ret = document.createElement(tag)
  fn?.(ret)
  return ret
}

/**
(originally from elib.mjs)
Suitable for appendChild-ing to document.head
*/
function scriptElement(scriptUrl) {
  return elementThen('script', scriptElement => {
    scriptElement.src  = scriptUrl
    scriptElement.type = 'text/javascript'
  })
}


/**
Expands when clicked
Primarily for use in debugging
Stolen from textcmd.js
*/
export function expandableElement(arg, expanded = false) {
  return elementThen(`span`, e => {
    e.classList.add('expandable')
    if(expanded)
      e.classList.add('expanded')
    // left bracket
    e.appendChild(elementThen('span', leftbracket => {
      leftbracket.innerText = '['
      leftbracket.classList.add('bracket', 'clickable')
      leftbracket.addEventListener('click', clickevent => {
        toggleElementClass(clickevent.target.parentElement, 'expanded')
      })
    }))
    // contents:
    let contentElement = arg
    contentElement.classList.add('content')
    e.appendChild(contentElement)
    // right bracket
    e.appendChild(elementThen('span', rightbracket => {
      rightbracket.innerText = ']'
      rightbracket.classList.add('bracket', 'clickable')
      rightbracket.addEventListener('click', clickevent => {
        toggleElementClass(clickevent.target.parentElement, 'expanded')
      })
    }))
  })
}


export function findParentMatching(startElement, queryString) {
  return startElement.closest(queryString)
}

let markdownInitialized = false
let markdownLoading     = false
let showdownConverter
async function initMarkdown() {
  if(markdownLoading) // already loading
    return asyncWaitUntil(()=> markdownInitialized) // wait for original initMarkdown caller to say its all clear
  markdownLoading = true
  // else:
  // showdown
  if(!('showdown' in globalThis)) {
    let scriptElem = scriptElement('https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js')
    scriptElem.addEventListener('error', errorEvent => writeAndThrow(`Showdown load error ${errorEvent.message}`, errorEvent, scriptElem))
    document.head.appendChild(scriptElem)
  }
  // katex, plugin and katex proper
  if(!('showdownKatex' in globalThis)) {
    let scriptElem = scriptElement('https://cdn.jsdelivr.net/npm/showdown-katex@0.8.0/dist/showdown-katex.min.js')
    scriptElem.addEventListener('error', errorEvent => writeAndThrow(`Showdown Katex extension load error ${errorEvent.message}`, errorEvent, scriptElem))
    document.head.appendChild(scriptElem)
  }
  if(!('katex' in globalThis)) {
    let scriptElem = scriptElement('https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js')
    scriptElem.addEventListener('error', errorEvent => writeAndThrow(`Katex load error ${errorEvent.message}`, errorEvent, scriptElem))
    document.head.appendChild(scriptElem)
    document.head.appendChild(styleElement('https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css'))
  }
  // initialize showdown and katex extension
  await asyncWaitUntil(()=> 'showdown' in globalThis && 'showdownKatex' in globalThis) // wait for libraries
  showdownConverter =  new showdown.Converter({
    simpleLineBreaks: true,
    emoji: true,
    simplifiedAutoLink: true,
    extensions: [
      showdownKatex({
        delimiters: [
          {left: "$$", right:"$$", display: false},
          {left: '$[', right:']$', display: true}
        ]
      })
    ]
  })
  showdownConverter.setFlavor('github')
  markdownInitialized = true
  markdownLoading     = false
}

/**
(originally from elib.mjs)
*/
export async function renderMarkdown(text) {
  if(!markdownInitialized) 
    await initMarkdown()
  return showdownConverter.makeHtml(text)
}

let highlightingInitialized = false
let highlightingLoading     = false
async function initCodeHighlighting() {
  if(highlightingLoading) // already loading
    return asyncWaitUntil(()=> highlightingInitialized) // wait for original inithighlighting caller to say its all clear
  highlightingLoading = true
  // else:
  // showdown
  if(!('hljs' in globalThis)) {
    document.head.appendChild(scriptElement('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.6.0/build/highlight.min.js'))
    document.head.appendChild(styleElement('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.6.0/build/styles/default.min.css'))
  }
  // initialize showdown and katex extension
  await asyncWaitUntil(()=> 'hljs' in globalThis) // wait for library
  hljs.configure({
    ignoreUnescapedHTML: true
  })
  highlightingInitialized = true
  highlightingLoading     = false
}

/**
(originally from elib.mjs)
*/
export async function renderHighlighting(text, language) {
  if(!highlightingInitialized) 
    await initCodeHighlighting()
  return elementThen('pre', pre => {
    pre.appendChild(elementThen('code', code => {
      let {value} = hljs.highlight(text, {language: language, ignoreIllegals: true})
      code.innerHTML = value
    }))
  })
}



export function attentionFlashElement(elem, style = 'outline') {
  let flashClass = 'attention-flashing-' + style
  elem.classList.add(flashClass)
  setTimeout(()=>{
    elem.classList.remove(flashClass)
  }, 500 /*0.5 second*/)
}


let escmInitialized = false
let escSet, escm
export async function initEscm() {
  if(!escmInitialized) {
    if(!document.head.querySelector('link[href*="basic-escm.css]'))
      document.head.appendChild(styleElement('/stuff/lib/escm/basic-escm.css'))
    let {basicEscset}    = await import('/stuff/lib/escm/basic-escm.mjs')
    let {extendedEscset} = await import('/stuff/lib/escm/extended-escm.mjs')
    escSet          = {...basicEscset, ...extendedEscset}
    escm            = await import('/stuff/lib/escm/escm.mjs')
    escmInitialized = true
  }
}

export async function renderEscapeMarkup(text) {
  if(!escmInitialized)
    await initEscm()
  let ret = escm.parsePreprocessEval(text, escSet)
  ret.classList.add('escm-root')
  return ret
}

const allowedShtmlTags = new Set([
  'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7',
  'br', 'details', 'summary'
])

export async function renderShtml(sourceStr) {
  let template = document.createElement('template')
  template.innerHTML = sourceStr.replaceAll(/<(\/?)([a-z\-]+)\>/g, (str, ender, tag) => {
    if(allowedShtmlTags.has(tag))
      return str
    else
      return `&lt;${ender ?? ''}${tag}&gt;`
  })
  return template.content
}

export async function renderContentTo(elem, content, contentType) {
  let contentTypeSplit = contentType.split(';')
  let newChild
  switch(contentTypeSplit[0]) {
    default: // console.error(`lib.mjs renderContentTo: unknown extension given ${ext}`, ...arguments)
    case 'text/plain': case '.txt':
      elem.innerHTML = content.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')
      elem.dataset.contenttype = 'text/plain'
      break
    case 'text/markdown': case '.md':
      elem.innerHTML = await renderMarkdown(content)
      elem.dataset.contenttype = 'text/markdown'
      break
    case 'application/javascript':
    case 'text/javascript': case '.js': case '.mjs': 
      newChild = await renderHighlighting(content, 'javascript')
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/javascript'
      break
    case 'text/css': case '.css': 
      newChild = await renderHighlighting(content, 'css')
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/css'
      break
    case 'text/json': case '.json': 
      newChild = await renderHighlighting(content, 'json')
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/json'
      break
    case 'text/html': case '.html': 
      newChild = await renderHighlighting(content, 'html')
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/html'
      break
    case 'text/shtml': case '.shtml': 
      newChild = await renderShtml(content)
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/shtml'
      break
    case 'text/escm': case '.escm': 
      newChild = await renderEscapeMarkup(content)
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/escm'
      break
  }
}


export function applyOnNewChildren(elem, fn, deep = false) {
  const observer = new MutationObserver((recordList, observer) => {
    for(const record of recordList) if(record.type === 'childList') for(const node of record.addedNodes)
      fn(node, observer)
  })
  observer.observe(elem, {childList: true, subtree: deep})
}

export function onAttributeChange(elem, fn) {
  let mutationObserver = new MutationObserver((mutations, observer) => {
    for(const mutation of mutations) {
      if(mutation.type === 'attributes')
        fn(mutation.attributeName, mutation.oldValue, observer)
    }
  })
  mutationObserver.observe(elem, {attributes: true})
}

export function onTextContentChange(elem, fn) {
  let mutationObserver = new MutationObserver((mutations, observer) => {
    for(const mutation of mutations) {
      if(mutation.type === 'characterData')
        fn(elem.textContent, observer)
    }
  })
  mutationObserver.observe(elem, {characterData: true})
}

/**
(originally from elib.mjs)
This uses promises and setTimeout to wait for a condition to be satisfied
Doing it this way allows you to use it with await, so you can wait without making a new block
if(x === undefined)
  await asyncWaitUntil(()=> x !== undefined)
*/
async function asyncWaitUntil(conditionFn) {
  return new Promise(res => {
    let step = 0
    let timeoutId
    let wait = () => {
      if(conditionFn()) {
        clearTimeout(timeoutId)
        res()
      } else {
        timeoutId = setTimeout(wait, 2*(step++))
      }
    }
    wait()
  })
}

// export function insertElementAfter(elem, toInsertElem) {
//   if(toInsertElem instanceof DocumentFragment) {
//     while(toInsertElem.hasChildNodes) {
//       let child = toInsertElem.lastChild
//       if(child instanceof Text)
//       elem.after('afterend', toInsertElem.lastChild)
//     }
//   } else if(toInsertElem instanceof Node) {
//     elem.insertAdjacentElement('afterend', toInsertElem)
//   } else {
//     writeAndThrow(`insertElementAfter, bad element ${toInsertElem.tagName} given`, ...arguments)
//   }
// }

/**
(originally from elib.mjs)
Suitable for appendChild-ing to document.head
*/
function styleElement(styleUrl) {
  return elementThen('link', scriptElement => {
    scriptElement.href = styleUrl
    scriptElement.rel  = 'stylesheet'
  })
}

/**
(originally from elib.mjs)
Splits at the first occurrence of the splitter regex
splitAtFirst('asdfg', /d/)
Returns ['as','fg']
*/
export function splitAtFirst(str, splitter) {
  let match = splitter.exec(str)
  if(match === null)
    return [str, undefined]
  else
    return [str.substring(0, match.index), str.substring(match.index + match[0].length, str.length)]
}


export function randomIntegerOn(start, end) {
  if(end < start)
    return randomIntegerOn(start, end)
  else if(end === start)
    return start
  else
    return Math.floor(Math.random()*(end+1-start)) + start
}


export function singleRandomChoice(choices) {
  return choices[randomIntegerOn(0, choices.length - 1)]
}
export function randomChoice(choices, n) {
  if(n === undefined) { // no count n given
    return singleRandomChoice(choices)
  } else { // count n is given
    let ret = []
    for(let i = 0; i < n; i++)
      ret.push(singleRandomChoice(choices))
    return ret
  }
}

const randomTokenStringChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export function randomTokenString(n) {
  return randomChoice(randomTokenStringChars, n).join('')
}



/**
This establishes a standard way of styling elements that are changing somehow
Current general.css style values are: 'dim', 'outline'
Returns a function to immediately reverse the styling (instead of waiting)
*/
export function styleInProgress(elem, style = 'dim', timeoutDelay = 1000*5) {
  const progressClass = `in-progress-${style}`
  elem.classList.add(progressClass)
  let timeoutId = setTimeout(() => {
    elem.classList.remove(progressClass)
  }, timeoutDelay)
  return () => { // prematurely reverse styling
    clearTimeout(timeoutId)
    elem.classList.remove(progressClass)
  }
}

/**
This replaces an element with another after a delay,
to give the new element time to have custom elements do their thing
*/
export function softReplace(oldElem, newElem) {
  newElem.hidden = true
  oldElem.insertAdjacentElement('afterend', newElem)
  setTimeout(() => {
    oldElem.replaceWith(newElem)
  }, 200)
}

// export function findSiblingMatching(startElem, selector) {
//   return startElem.parentElement,querySelector(`:scope > ${selector}`)
// }

/**
Looks at each of startElem's parents, and those parents' immediate children
*/
export function getFirstInTreeMatching(elem, selector, fullSearch = false) {
  let lastParent
  let parent = elem
  while(true) {
    lastParent = parent
    parent = parent.parentElement
    if(!parent) {
      parent = lastParent.getRootNode().host
      if(!parent)
        return undefined
    }
    // else
    if(parent.matches(selector))
      return parent
    // else
    let child = parent.querySelector(fullSearch ? selector : `:scope > ${selector}`)
    if(child !== null)
      return child
    // else, continue
  }
}

// /**
// Looks at each of startElem's parents, and those parents' immediate children
// */
// function getFirstInTreeMatching(startElem, selector) {
//   let parent = startElem
//   while(true) {
//     parent = parent.parentElement
//     if(!(parent ?? false))
//       return undefined
//     // else
//     if(parent.matches(selector))
//       return parent
//     // else
//     let child = parent.querySelector(`:scope > ${selector}`)
//     if(!(child ?? false))
//       return child
//     // else, continue
//   }
// }

/**
(originally from elib.mjs)
*/
export function getNextSiblingMatching(startElem, selector) {
  let elem = startElem
  while(true) {
    elem = startElem.nextElementSibling
    if(!elem) // elem is null; no next sibling
      return undefined
    // else:
    if(elem.matches(selector))
      return elem
  }
}
/**
(originally from elib.mjs)
*/
export function getPrevSiblingMatching(startElem, selector) {
  let elem = startElem
  while(true) {
    elem = startElem.previousElementSibling
    if(elem === null) // elem is null; no previous sibling
      return undefined
    // else:
    if(elem.matches(selector))
      return elem
  }
}

/**
(originally for callib.mjs)
Syntax is:
               : initial [dirspeclist]
   initial     : document | body | this
   dirspeclist : dirspec [>> dirspeclist]
   dirspec     : direction [specifier]
   direction   : document | body | this
And specifier is a query selector string
eg:
this parent                       : goes to the given element's parent
this parent .pagelet              : the first pagelet parent of the given element
body child .pagelet >> first      : the first child of the first found pagelet in the body of the page
this parent >> child :scope > div : the first div sibling of the given element
*/
export function selectTargetElement(elem, code) {
  let currentElem = elem
  let [initial, specifierCode] = splitAtFirst(code, /\s+/) ?? [undefined, undefined]
  switch(initial) {
    case 'document' : currentElem = document      ; break
    case 'body'     : currentElem = document.body ; break
    case 'this'     : currentElem = elem          ; break
    default         : writeAndThrow(`selectTargetElement invalid initial element`, ...arguments) ; break
  }
  if(specifierCode === undefined || specifierCode === null)
    return currentElem
  // else
  let splitCode = specifierCode.split('>>')
  for(let codelet of splitCode) {
    codelet = codelet.trim()
    if(!(currentElem instanceof Node)) // null, etc
      return undefined
    // else
    let direction, specifier
    [direction, specifier] = splitAtFirst(codelet, /\s+/) ?? [codelet, ''] // default to ignoring specifier
    let noSpecifierGiven
    if((specifier ?? '') === '') { // no specifier given
      specifier  = '*'  // default to anything
      noSpecifierGiven = true
    }
    direction = direction.trim()
    specifier = specifier.trim()
    if(noSpecifierGiven) {
      switch(direction) {
        case 'parent'   : currentElem = currentElem.parentElement           ; break
        case 'prev'     : currentElem = currentElem.previousElementSibling  ; break
        case 'next'     : currentElem = currentElem.nextElementSibling      ; break
        case 'first'    : currentElem = currentElem.firstElementChild       ; break
        case 'last'     : currentElem = currentElem.lastElementChild        ; break
        default         : writeAndThrow(`selectTargetElement bad target selector direction`, ...arguments, direction, specifier); break
      }
    } else {
      switch(direction) {
        case 'parent'   : currentElem = currentElem.closest(specifier)                                       ; break
        case 'prev'     : currentElem = getPrevSiblingMatching(currentElem, specifier)                       ; break
        case 'next'     : currentElem = getNextSiblingMatching(currentElem, specifier)                       ; break
        case 'tree'     : currentElem = getFirstInTreeMatching(currentElem, specifier)                       ; break
        case 'fulltree' : currentElem = getFirstInTreeMatching(currentElem, specifier, true)                 ; break
        case 'child'    : currentElem = currentElem.querySelector(specifier)                                 ; break
        case 'sibling'  : currentElem = getSiblingMatching(currentElem, specifier)                           ; break
        case 'siblings' : currentElem = currentElem.parentElement?.querySelectorAll(`:scope > ${specifier}`) ; break
        default         : writeAndThrow(`selectTargetElement bad target selector direction`, ...arguments, direction, specifier); break
      }
    }
  }
  return currentElem
}

export function copyAttributesInto(elemA, elemB) {
  for(const attr of elemA.attributes)
    elemB.setAttribute(attr.name, attr.value)
}
