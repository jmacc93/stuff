
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
function styleElement(styleUrl) {
  return elementThen('link', scriptElement => {
    scriptElement.href = styleUrl
    scriptElement.rel  = 'stylesheet'
  })
}


//#region Mixin stuff

export function copyAttributesInto(elemA, elemB) {
  for(const attr of elemA.attributes)
    elemB.setAttribute(attr.name, attr.value)
}

/**
<script> elements created via innerHTML won't execute,
this is a workaround for script elements
plmx.replicateAndReplaceScripts(parentElementMadeWithInnerHTML)
This replaces all child scripts with functionally equivalent scripts
*/
export function replicateAndReplaceScripts(elem) {
  for(const childScript of elem.querySelectorAll('script')) {
    let replica = document.createElement('script')
    if(childScript.hasAttributes())
      copyAttributesInto(childScript, replica)
    replica.textContent = childScript.textContent
    childScript.replaceWith(replica)
  }
}

export async function getAndMakeFragmentFromUrl(url) {
  let response = await fetch(url)
  let htmlSource = await response.text()
  
  // sourceElement is a dummy element because we need to parse htmlSource but replace self with fragment
  let sourceElement  = document.createElement('template')
  sourceElement.innerHTML = htmlSource.trim()
  sourceElement = sourceElement.content
  replicateAndReplaceScripts(sourceElement)
  
  return sourceElement
}

export async function mixinHtml(callElem) {
  const lib = await import('/stuff/lib/lib.mjs')
  let src = callElem.getAttribute('mixin-src').trim()
  if(src === undefined || src === '')
    writeAndThrow(`<html-mixin> bad src attribute given`, callElem)
  // else:
  
  let retReplacementFrag = await getAndMakeFragmentFromUrl(src)
  
  // mix old children inserts into slots if they're present
  let oldChildInserts = callElem.querySelectorAll(':scope > *[slot]')
  let defaultSlot     = retReplacementFrag.querySelector('slot:not([name]), slot[name=""]')
  for(const insert of oldChildInserts) {
    let correspondingSlot = retReplacementFrag.querySelector(`slot[name="${insert.getAttribute('slot')}"]`)
    if(correspondingSlot ?? false)
      correspondingSlot.replaceWith(insert)
    else if(defaultSlot ?? false)
      defaultSlot.appendChild(insert)
  }
  
  // add mixin's old children back to fragment, if <... class="... child-mixin-target"> exists, then put children there
  let oldChildrenTarget = retReplacementFrag.lastElementChild ?? retReplacementFrag
  let defaultChildSlot = retReplacementFrag.querySelector('slot[name="child-mixin-target"]')
  let defaultChildSlotReplacement = (defaultChildSlot ?? false) ? document.createDocumentFragment() : undefined
  while(callElem.children.length > 0) {
    if(defaultChildSlotReplacement ?? false)
      defaultChildSlotReplacement.appendChild(callElem.firstChild)
    else
      oldChildrenTarget.appendChild(callElem.firstChild)
  }
  if(defaultChildSlotReplacement ?? false)
    defaultChildSlot.replaceWith(defaultChildSlotReplacement)
  
  // add attributes back to replacement
  let firstElementChild = retReplacementFrag.firstElementChild
  if(firstElementChild) {
    for(const attr of callElem.attributes) {
      if(attr.name === 'class') {
        for(const classname of callElem.classList)
          firstElementChild.classList.add(classname)
      } else if(attr.name === 'style') {
        firstElementChild.setAttribute('style', `${firstElementChild.getAttribute('style') ?? ''}; ${attr.value}`)
      } else if(attr.name !== 'src' && attr.name !== 'framed') {
        firstElementChild.setAttribute(attr.name, attr.value)
      }
    }
  }
  
  // if(this.hasAttribute('framed'))
  //   retReplacementFrag = await lib.controllerFrameAround(retReplacementFrag)
  
  callElem.replaceWith(retReplacementFrag)
}

//#endregion

//#region escm stuff

let escmInitialized = false
let escSet, escm
export async function initEscm() {
  if(!escmInitialized) {
    if(!document.head.querySelector('link[href*="basic-escm.css]'))
      document.head.appendChild(styleElement('/stuff/lib/basic-escm.css'))
    let {basicEscset}    = await import('/stuff/lib/basic-escm.mjs')
    let {extendedEscset} = await import('/stuff/lib/extended-escm.mjs')
    escSet          = {...basicEscset, ...extendedEscset}
    escm            = await import('/stuff/lib/escm.mjs')
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
export async function transformToEscm(callElem) {
  const newChild = await renderEscapeMarkup(callElem.textContent)
  callElem.replaceWith(newChild)
}

//#endregion

export async function mixinPageInUrl(callElem) {
  // ... 
}