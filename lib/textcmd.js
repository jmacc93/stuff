
/*
License: MIT
Original author: Joe M
400766f8f9b4b14f38b5a318bf221b6d2d6794e39adda29f6158da0ef807aa0bf7951380636354f43b9a43cb8620b9243216a44ccdd6dca1af576b4c0448049d
*/

let txtcmd = {}

function __txtcmdLoader() {
  let debuggerOnError = false
  function writeAndThrow(errorMessage, ...args) {
    if(true) {
      if(debuggerOnError) {
        console.error(...args)
        debugger
      }
      throw new Error(errorMessage)
    }
  }
  txtcmd.debuggerOnError = debuggerOnError

  /**
  elementThen('span', e => {e.innerText = 'asdf'})
  Makes an HTMLElement with the tag in the first argument,
  then applies the function in the second argument to that
  Function shouldn't return anything
  */
  function elementThen(tag, fn = undefined) {
    let ret = document.createElement(tag)
    fn?.(ret)
    return ret
  }

  /**
  groupElement('span', [elem1, elem2, ...]) -> <span>elem1 elem2 ...</span>
  groupElement(tag, innerElements)
  Puts the HTMLElements in the innerElements array into a new element with the given tag
  */
  function groupElement(tag, children) {
    let ret = elementThen(tag)
    for(const child of children) {
      if(child ?? false) // child is defined
        ret.appendChild(child)
    }
    return ret
  }
  
  /**
  asElement(obj) turns obj into an HTMLElement as best it can
  Use this when you don't care what obj is, but you want it to be an HTMLElement
  */
  function asElement(obj) {
    if(!(obj ?? false)) { // null or undefined
      return undefined
    } else if(obj instanceof HTMLElement) {
      return obj
    } else if(typeof obj === 'string') {
      return plaintextElement('span', obj)
    } else if(typeof obj === 'object') { // array or {...} object
      if(Array.isArray(obj)) {
        if(obj.length == 1)
          return asElement(obj[0])
        else
          return groupElement('span', obj.map(asElement))
      } else {
        return plaintextElement('span', obj)
      }
    } else { // is some other type
      return plaintextElement('span', obj)
    }
  }
  
  /**
  applyToDescendants(elem like: <div class='a'><div class='b'></div><div class='c'></div></div>, elem => {
    console.log(elem.classList)
  }) // prints something like: b c
  applyToThisAndDescendants(elem like: <div class='a'><div class='b'></div><div class='c'></div></div>, elem => {
    console.log(elem.classList)
  }) // prints something like: a b c
  applyToDescendants(elem, fn)
  Applies fn recursively to all deeply-nested children of HTMLElement elem
  applyToThisAndDescendants(elem, fn)
  Applies fn to elem then calls applyToDescendants
  */
  function applyToDescendants(elem, fn) {
    if(elem.children !== undefined)
      for(const child of elem.children) {
        fn(child)
        applyToDescendants(child, fn)
      }
  }
  function applyToThisAndDescendants(elem, fn) {
    fn(elem)
    applyToDescendants(elem, fn)
  }


  /**
  plaintextElement('span', "asdf")
  Makes an HTMLElement with the tag in the first argument,
  then sets it's innerText to the string in the second argument
  */
  function plaintextElement(tag, text) {
    let ret = document.createElement(tag)
    ret.innerText = text
    return ret
  }

  function regularizeToElement(tag, obj) {
    if(Array.isArray(obj)) {
      if(obj.length === 1) {
        return regularizeToElement(tag, obj[0])
      } else {
        let ret = elementThen(tag)
        for(const element of obj) {
          let gelem = regularizeToElement(tag, element)
          if(gelem !== undefined && gelem !== null)
            ret.appendChild(gelem)
        }
        return ret
      }
    } else {
      if(obj instanceof HTMLElement)
        return obj
      else if(typeof obj === 'string')
        return plaintextElement(tag, obj)
      else
        return undefined
    }
  }


  /**
  for(const match of matchesBetween('xa xb xc', /x(\w)/, 2, 5))
    console.log(match[1])
  Prints b
  */
  function* matchesBetween(text, regex, a, b) {
    const newRegex = new RegExp(regex, 'g')
    newRegex.lastIndex = a
    while(true) {
      let match = newRegex.exec(text)
      if(match === null || match.index > b)
        return
      yield match
    }
  }

  /**
  findBalancedCloseDelimiter(text, start, openr, closer)
  Finds the position of the nearest closer that isn't paired with a previous openr,
  where openr and closer are regex objects, start is an string index
  Here are some square brackets (openr: [, close: ]) to demonstrate balanced delimiters:
    asdf [ asdf asdf ] <- these are balanced
    asdf [ asdf asdf [ <- these aren't balanced
    asdf [ asdf [ asdf asdf ] asdf ] <- these are balanced
    asdf [ asdf [ asdf asdf   asdf ] <- these aren't balanced
    asdf [ asdf   asdf asdf ] asdf ] <- these aren't balanced
    asdf ] asdf [ asdf asdf ] asdf ] <- these aren't balanced
  */
  function findBalancedCloseDelimiter(text, startloc, opendel, closedel) {
    // we search for next open and close dels at the same time:
    let regex = new RegExp(`(?<!\\\\)((?:${opendel.source})|(?:${closedel.source}))`, 'g')
    regex.lastIndex = startloc-1
    let count = 0 // after finding the first open del this won't be 0 again until we find the balanced close del
    while(true) {
      const match = regex.exec(text) // this is either an open del, close del, or null
      if(match ?? false) { // match is either open or close del
        if(opendel.test(match[1])) // match is an open del
          count++
        else // match is a close del
          count--
        if(count < 0) // found balanced close del (or our first match was a close del)
          return regex.lastIndex
      } else { // didn't find anything
        return undefined
      }
    }
  }

  /**
  headRegex defaults to (?<!\\)\\(?<head>\w+)\( which is composed of (?<!\\) to stop \
  blocking the command, \\ to signal the start of the command, (?<head>\w+) which is the
  command head group, the ?<head> group must be included to name the head, and \( which
  is equivalent to the cmdOpenDelimiterRegex variable
  Use configure({cmdHead: ...}) to set just the \\(?<head>\w+) part (the other parts are added)
  */
  let headRegex = RegExp(/(?<!\\)\\(?<head>\w+)\(/)
  let cmdOpenDelimiterRegex  = RegExp(/\(/)
  let cmdCloseDelimiterRegex = RegExp(/\)/)
  txtcmd.headRegex = headRegex
  txtcmd.cmdOpenDelimiterRegex = cmdOpenDelimiterRegex
  txtcmd.cmdCloseDelimiterRegex = cmdCloseDelimiterRegex

  /**
  linearizeInside(head, body, startGroups?)
  This essentially just adds the initiator \ and opening delimiter ( back
  The optional startGroups argument is from any capture groups in the headRegex variable including the ?<head> group
  For use in linearization of a parsed tree
  */
  let linearizeInsideStart = function(inside) {
    return `\\${inside.head}(`
  }
  /**
  linearizeInsideEnd(inside)
  This essentially just adds the close delimiter ) back
  For use in linearization of a parsed tree
  */
  let linearizeInsideEnd = function(inside) {
    return `)`
  }
  
  /**
  The default commandset to use for renderElement
  */
  let defaultCmdset = undefined
  

  /**
  cmdHead:
    RegExp
    /\\(?<head>\w+)/
    /\\(?<head>\<\d*\>)/
    etc
    A regex like \\(?<head>\w+) specifying the head of a textcmd
    The command head of the command must be the ?<head> capture group,
    eg: \\(?<head>\w+) on \foo(x, y, z) gives foo as the cmd name
  openDelimiter
    Something like /\(/
  closeDelimiter
    Something like /\)/
  linearizeInsideStart
    A function that takes an inside PTE and produces a string which
    is the beginning of the source code which produces that inside PTE
    Theoretically, linearizeInsideStart(inside) + linearize(inside.body) + linearizeInsideEnd(inside)
    will produce the original source code which produced the inside PTE
    This function is probably something like: inside => `\\${inside.head}(`
    Used in the function linearize to turn a parse tree back into an equivalent source
  linearizeInsideEnd
    The other end of linearizeInsideStart's linearization process
    Probably something like: inside => `)`
    Used in the function linearize to turn a parse tree back into an equivalent source
  defaultCmdset
    Just sets defaultCmdset, which is the commandset the function txtcmd.renderElement uses
    if it can't find a better match
  */
  function configure(opts){
    for(const key in opts) {
      if(!(opts[key] ?? false))
        throw new Error(`${key} must not be undefined or null if used for configuration`)
      switch(key) {
        case 'cmdHead':
          if(!(opts.cmdHead instanceof RegExp))
            throw new Error(`cmdHead must be a regexp`)
          headRegex = RegExp(`(?<!\\\\)${opts.cmdHead.source}${opts.openDelimiter.source ?? cmdOpenDelimiterRegex.source}`)
        case 'openDelimiter':
          if(!(opts.openDelimiter instanceof RegExp))
            throw new Error(`openDelimiter must be a regexp`)
          cmdOpenDelimiterRegex = opts.openDelimiter
        case 'closeDelimiter':
          if(!(opts.closeDelimiter instanceof RegExp))
            throw new Error(`closeDelimiter must be a regexp`)
          cmdCloseDelimiterRegex = opts.closeDelimiter
        case 'linearizeInsideStart':
          linearizeInsideStart = opts.linearizeInsideStart
        case 'linearizeInsideEnd':
          linearizeInsideEnd = opts.linearizeInsideEnd
        case 'defaultCmdset':
          defaultCmdset = opts.defaultCmdset
        case 'autoRender':
          setAutorendering(opts.autoRender ?? false)
      }
    }
  }
  txtcmd.configure = configure

  function containsTextcmd(text) {
    return (new RegExp(headRegex)).test(text)
  }

  /**
  Options for apply(...)
    startreg:
      Like the regex /\\(?<head>\w+)/
      Equivalent to headRegex (default: /\\(?<head>\w+)\(/) without the cmdOpenDelimiterRegex (default: /\(/) on the end;
        headRegex is set as an effect of using the cmdHead configuration option
    openDelimiter:
      Like the regex /\(/, equivalent to cmdOpenDelimiterRegex
  */
  // type applyOptions = {
  //   startreg:        RegExp,
  //   openDelimiter?:  RegExp,
  //   closeDelimiter?: RegExp
  // }

  /**
  apply('adsf \foo(qwer) zxcv', inside, outside)
    Equivalent to: outside(0, 5); inside('foo', 10, 14); outside(16, 20)
    Does not evaluate the body of textcommands
    Inside and outside functions are always called in alternating order
  apply.substrings('asdf \foo(qwer) zxcv', inside outside)
    Equivalent to: outside('asdf '); inside('foo', 'qwer'); outside(' zxcv')
  In both apply and apply.substrings, insideFn's third argument is the matches for the cmd head finding regex startreg
  */
  // apply(
  //   text: string, 
  //   insideFn: (head: string,start:number,end:number, matches: any)=>void, 
  //   outsideFn: (start:number,end:number)=>void, 
  //   opts?: applyOptions
  // ): void {
  function apply(text, insideFn, outsideFn, opts = undefined) {
    let startreg = (opts?.startreg ?? false)
      ? new RegExp(opts.startreg.source + (opts.openDelimiter ?? cmdOpenDelimiterRegex), 'g')  // \\(?<head>\w+) + \(
      : new RegExp(headRegex, 'g')
    let prevIndex = 0
    while(true) {
      let startmatch = startreg.exec(text)
      if(startmatch === null) { // reached end of source
        if(prevIndex !== text.length)
          outsideFn(prevIndex, text.length)
        return void 0
      }
      const openloc = startreg.lastIndex // renaming for clarity
      const txtcmdhead = startmatch[1]
      // else:
      const closeloc = findBalancedCloseDelimiter(
        text, openloc+1,
        opts?.openDelimiter ?? cmdOpenDelimiterRegex,  // Like /\(/
        opts?.closeDelimiter ?? cmdCloseDelimiterRegex // like/\)/\
      )
      if(closeloc === undefined) { // reached end of source without finding end delimiter
        if(prevIndex !== text.length)
          outsideFn(prevIndex, text.length)
        return void 0
      }
      // else:
      if(prevIndex !== openloc - startmatch[0].length)
        outsideFn(prevIndex, openloc - startmatch[0].length) // everything up to start of textcmd head
      insideFn(txtcmdhead, openloc, closeloc - 1, startmatch.groups)
      startreg.lastIndex = closeloc
      prevIndex          = closeloc
    }
  }
  apply.substrings = function(text, insidefn, outsidefn, opts = undefined) {
    apply(text, 
      (head, start, end, matches) => { // inside function
        insidefn(head, text.substring(start, end), matches)
      }, 
      (start, end) => { // outside function
        outsidefn(text.substring(start, end))
      },
      opts
    )
  }
  txtcmd.apply = apply

  /**
  splitOutsideTextcmds('\foo(a; b); \goo(y; z)', /;/) // returns ['\foo(a; b)', ' \goo(y; z)'] 
  Splits the given text string only on outside PTEs
  splitOutsideTextcmds(source, splitregex, maxCount = -1)
  The maxCount parameter limits the number of matched textcmds,
  maxCount = -1 is equivalent to infinite count
  */
  function splitOutsideTextcmds(text, splitregex, maxCount = -1) {
    let segs = []
    let lastLoc = 0
    let splitter = new RegExp(splitregex, 'gd')
    splitter.lastIndex = 0
    let currentCount = 0
    apply(text, 
      ()=>{}, // inside fn
      (start, end) => { // outside fn
        for(const match of matchesBetween(text, splitter, start, end)) {
          if(maxCount < 0 || (maxCount > 0 && currentCount < maxCount)) {
            segs.push(text.substring(lastLoc, match.index))
            lastLoc = match.index + match.length
            currentCount++
          } else { // do nothing
            return void 0
          }
        }
      }
    )
    segs.push(text.substring(lastLoc, text.length))
    return segs
  }


  // cmdset.groupDefault: CmdsetElement
  // type CmdsetElement = {
  //   preprocess?: (subtree: PTE) => PTE,                // transforms subtree to subtree, optional
  //   evaluate:    (body: any)    => any | Promise<any>, // result of child evaluation to the intended output
  //   check?:      (body: string) => boolean,            // is given body free of errors?
  //   stopsParser?: boolean                              // for textcmds like \comment and \code which don't eval their bodies, defaults to false
  // }
  // type Cmdset = {
  //   [key: string]: CmdsetElement
  // }

  // type InsidePTE = { // parse tree element
  //   type: string,    // = "inside"
  //   head: string,    //  foo
  //   body: PTE,
  //   matches: any ,   // found by apply startreg
  //   argCount: number // how many arguments body is interpreted as having
  // }
  // type OutsidePTE = { // parse tree element
  //   type: string,   // = "outside"
  //   body: string
  // }
  // type GroupPTE  = (InsidePTE | OutsidePTE)[]// parse tree element
  //  
  // type PTE = InsidePTE | OutsidePTE | GroupPTE

  /**
  parse('...')
  Returns an object that looks like:
  PTE := [ {type: 'inside' | 'outside', head: string | undefined, body: string | PTE}, ... ] | {type:'outside', body: source}

  */
  function parse(source, cmdset = undefined) {
    if(!containsTextcmd(source))
      return {type: 'outside', body: source}
    // else:
    let ret = [] // GroupPTE
    if(cmdset ?? false) { // cmdset given, note: cmdset is optional
      apply.substrings(source,
        (head, body, matches) => { // inside textcmd; head and body are strings
            let cmd = cmdset[head]
            // if(cmd ?? false) { // cmd is defined in cmdset
            let parsedBody = body
            let argCount
            if(cmd !== undefined && 'argDelimiter' in cmd) {
              parsedBody = splitOutsideTextcmds(body, cmd.argDelimiter, (cmd.expectedArgCount !== undefined ) ? cmd.expectedArgCount - 1 : -1)
              argCount = parsedBody.length
            } else {
              argCount = 1
            }
            if(cmd?.stopsParser ?? false)  // cmd blocks parser (for eg: \code, \comment, etc)
              parsedBody = {type: 'outside', body: parsedBody}
            else
              parsedBody = Array.isArray(parsedBody) ? parsedBody.map(elem => parse(elem, cmdset)) : parse(body, cmdset)
            ret.push({type: 'inside', head: head, body: parsedBody, matches: matches, argCount: argCount})
            // } else { // cmd isn't defined in cmdset (default)
              // ret.push({type: 'inside', 'head': head, body: parse(body)})
              // ret.push({type: 'inside', head: 'default', body: {
              //   type: 'inside', head: head, body: parse(body, cmdset), matches: matches
              // }, matches: {head: 'default'}})
            // }
        },
        (body) => { // outside textcmd
          ret.push({type: 'outside', body: body})
        }
      )
    } else { // no cmdset given, just parse
      apply.substrings(source,
        (head, body, matches) => { // inside textcmd
          ret.push({type: 'inside', head: head, body: parse(body), matches: matches})
        },
        body => { // outside textcmd
          ret.push({type: 'outside', body: body})
        }
      )
    }
    return ret
  }
  txtcmd.parse = parse

  /**
  If groupEnter/End, insideEnter/End, or outsideEnter return something not undefined then 
  treeApply breaks immediately and returns that value
  The *Enter functions are applied before child elements' functions are applied, *End functions
  are applied after
  Guaranteed to evaluate in depth first ordering
  */
  // treeApply(
  //  parseTree: PTE, 
  //  opts: {
  //    groupEnter?:   (group:   GroupPTE)   => (undefined | any),
  //    insideEnter?:  (inside:  InsidePTE)  => (undefined | any), 
  //    groupExit?:    (group:   GroupPTE)   => (undefined | any),
  //    insideExit?:   (inside:  InsidePTE)  => (undefined | any), 
  //    outsideEnter?: (outside: OutsidePTE) => (undefined | any)
  //}) : any
  function treeApply(parseTree, opts) {
    let possibleRet
    if(Array.isArray(parseTree)) { // its a group PTE, elements are inside and outside PTEs
      const group = parseTree // rename for clarity
      if((possibleRet = opts.groupEnter?.(group)) !== undefined) return possibleRet
      for(let i = 0; i < group.length; i++)
        if((possibleRet = treeApply(group[i], opts)) !== undefined) return possibleRet
      if((possibleRet = opts.groupExit?.(group)) !== undefined) return possibleRet
    } else if(parseTree.type === 'inside') { // its an inside PTE
      const inside = parseTree // rename for clarity
      if((possibleRet = opts.insideEnter?.(inside))   !== undefined) return possibleRet
      if((possibleRet = treeApply(inside.body, opts)) !== undefined) return possibleRet
      if((possibleRet = opts.insideExit?.(inside))    !== undefined) return possibleRet
    } else { // its an outside PTE
      const outside = parseTree // rename for clarity
      if((possibleRet = opts.outsideEnter?.(outside)) !== undefined) return possibleRet
    }
  }
  txtcmd.treeApply = treeApply

  /**
  treeCollapse is like treeApply but the returns from the functions aren't immediately returned but used as arguments
  for the other functions
  ie: a group first evaluates its child element's using insideFn and outsideFn then the groupFn is applied on
  those functions' returns
  */
  // treeCollapse(
  //   parseTree: PTE, 
  //   groupFn:   (group:   GroupPTE,   arg: any[]) => any,
  //   insideFn:  (inside:  InsidePTE,  arg: any)   => any, 
  //   outsideFn: (outside: OutsidePTE)             => any
  // ): any {
  function treeCollapse(parseTree, groupFn, insideFn, outsideFn) {
    if(parseTree === undefined) writeAndThrow(`parseTree is undefined`, {parseTree: parseTree, groupFn:groupFn, insideFn:insideFn, outsideFn:outsideFn})
    if(Array.isArray(parseTree)) { // its a group PTE, elements are inside and outside PTEs
      const group = parseTree // rename for clarity
      let argArray = new Array(group.length)
      for(let i = 0; i < group.length; i++)
        argArray[i] = treeCollapse(group[i], groupFn, insideFn, outsideFn)
      return groupFn(group, argArray)
    } else if(parseTree.type === 'inside') { // its an inside PTE
      const inside = parseTree // rename for clarity
      let arg = treeCollapse(inside.body, groupFn, insideFn, outsideFn)
      return insideFn(inside, arg)
    } else { // its an OutsidePTE
      const outside = parseTree // rename for clarity
      return outsideFn(outside)
    }
  }
  treeCollapse.async = async function(parseTree, groupFn, insideFn, outsideFn) {
    if(Array.isArray(parseTree)) { // its a group PTE, elements are inside and outside PTEs
      const group = parseTree // rename for clarity
      let argArray = new Array(group.length)
      for(let i = 0; i < group.length; i++)
        argArray.push(treeCollapse.async(group[i], groupFn, insideFn, outsideFn))
      return Promise.all(argArray).then(val => groupFn(group, val))
    } else if(parseTree.type === 'inside') { // its an inside PTE
      const inside = parseTree // rename for clarity
      let arg = treeCollapse.async(inside.body, groupFn, insideFn, outsideFn)
      return arg.then(val => insideFn(inside, val))
    } else { // its an outside PTE
      const outside = parseTree // rename for clarity
      return outsideFn(outside)
    }
  }
  txtcmd.treeCollapse = treeCollapse

  /**
  linearize(tree, cmdset)
  Turns a parse tree back into a string. Use after preprocess step to get preprocessed source
  */
  function linearize(parseTree) {
    let segs = [] // string[]
    treeApply(parseTree, {
      insideEnter: (inside) => { //  \foo(
        if(inside.head !== 'default')
          segs.push(linearizeInsideStart(inside))
      },
      insideExit: (inside) => { // close delimiter )
        if(inside.head !== 'default')
          segs.push(linearizeInsideEnd(inside))
      },
      outsideEnter: (outside) => {
        segs.push(outside.body)
      }
    })
    return segs.join('')
  }
  txtcmd.linearize = linearize

  /**
  If a cmdset.default, or cmdset.errorOnNoError commands cannot be found, should this raise an error?
  */
  let errorOnNoDefault = false
  let errorOnNoError   = false
  txtcmd.errorOnNoDefault = errorOnNoDefault
  txtcmd.errorOnNoError = errorOnNoError

  /**
  If outsideDefault is given in the cmdset, then that is used to evaluate outside parse tree elements,
  otherwise the body of the outside is returned for outside elements
  */
  function evaluate(parseTree, cmdset) {
    if(!(cmdset ?? false)) // cmdset is undefined 
      writeAndThrow(`given cmdset is undefined`, {parseTree: parseTree, cmdset: cmdset})
    
    let ret = treeCollapse(parseTree, 
      (_group, argArray) => { // group function
        if('groupDefault' in cmdset) {
          return cmdset.groupDefault.evaluate(argArray)
        } else {
          return argArray
        }
      },
      (inside, arg) => { // inside function
        let cmd
        if(inside.head in cmdset)
          cmd = cmdset[inside.head]
        if(cmd === undefined && 'default' in cmdset)
          cmd = cmdset.default
        if(cmd === undefined) {
          if(errorOnNoDefault)
            writeAndThrow(`No default command given in cmdset!`, {parseTree: parseTree, cmdset: cmdset})
          else
            return elementThen('span', ret => {
              let child = asElement(arg)
              ret.appendChild(plaintextElement('span', linearizeInsideStart(inside)))
              if(child ?? false)
                ret.appendChild(child)
              ret.appendChild(plaintextElement('span', linearizeInsideEnd(inside)))
            })
        }
        // else:
        return cmd.evaluate(arg, inside.argCount)
      },
      (outside) => { // outside function
        return cmdset.outsideDefault?.evaluate(outside.body) ?? outside.body
      }
    )
    if(!(ret instanceof HTMLElement)) {
      if(Array.isArray(ret))
        ret = regularizeToElement('span', ret)
      else if(typeof ret === 'string')
        ret = plaintextElement('span', ret)
      // then:
      if(ret === undefined || ret === null)
        ret = elementThen('span')
    }
    if(ret === undefined || ret === null)
      writeAndThrow(`evaluate return is null: ${ret}`, ret, parseTree, cmdset)
    return ret
  }
  evaluate.async = async function(parseTree, cmdset) {
    if(!(cmdset ?? false))    writeAndThrow(`given cmdset is undefined`,   {parseTree: parseTree, cmdset: cmdset})
    if(!(parseTree ?? false)) writeAndThrow(`given parseTree is undefined`,{parseTree: parseTree, cmdset: cmdset})
    
    return treeCollapse.async(parseTree, 
      (group, argArray) => { // group function
        if('groupDefault' in cmdset) {
          return cmdset.groupDefault.evaluate(argArray)
        } else {
          let elemArray = argArray.map(arg => typeof arg === 'string' ? plaintextElement('span', arg) : arg)
          return regularizeToElement('span', elemArray)
        }
      },
      (inside, arg) => { // inside function
        let cmd
        if(inside.head in cmdset)
          cmd = cmdset[inside.head]
        if(cmd === undefined && 'default' in cmdset)
          cmd = cmdset.default
        if(cmd === undefined) {
          if(errorOnNoDefault)
            throw new Error(`No default command given in cmdset!`, {cause: {parseTree: parseTree, cmdset: cmdset}}) 
          else
            return plaintextElement('span', `\\${linearizeInsideStart(inside)}${arg}${linearizeInsideEnd(inside)}`)
        }
        // else:
        return cmd.evaluate(arg)
      },
      (outside) => { // outside function
        return cmdset.outsideDefault?.evaluate(outside.body) ?? plaintextElement('span', outside.body)
      }
    )
  }
  txtcmd.evaluate = evaluate

  /**
  If outsideDefault is given in the cmdset, then that is used to evaluate outside parse tree elements,
  otherwise the body of the outside is returned for outside elements
  Note: this is applied TO the tree, so the tree is modified afterwards
  */
  function preprocess(parseTree, cmdset) {
    if(!(cmdset ?? false)) writeAndThrow(`given cmdset is undefined`, {parseTree: parseTree, cmdset: cmdset})
    if(!(parseTree ?? false)) writeAndThrow(`given parseTree is undefined`, {parseTree: parseTree, cmdset: cmdset})
    
    treeApply(parseTree, {
      groupEnter: (group) => { // group function
        cmdset.groupDefault?.preprocess?.(group)
      },
      insideEnter: (inside, arg) => { // inside function
        if(inside.head in cmdset)
          cmdset[inside.head].preprocess?.(arg) 
        else
          cmdset.default?.preprocess?.(arg)
      },
      outsideEnter: (outside) => { // outside function
        cmdset.outsideDefault?.preprocess?.(outside)
      }
    })
  }
  txtcmd.preprocess = preprocess
  // preprocess.async = async function(parseTree: PTE, cmdset: Cmdset): Promise<any> {
  // Note: this shouldn't work correctly right now
  // preprocess.async = async function(parseTree, cmdset) {
  //   if(!(cmdset ?? false)) writeAndThrow(`given cmdset is undefined`, {parseTree: parseTree, cmdset: cmdset})
  //   if(!(parseTree ?? false)) writeAndThrow(`given parseTree is undefined`, {parseTree: parseTree, cmdset: cmdset})
  //   preprocess(parseTree, cmdset)
  // }

  function parsePreprocessEval(source, cmdset) {
    let parseTree = parse(source, cmdset)
    preprocess(parseTree, cmdset)
    return evaluate(parseTree, cmdset)
  }
  txtcmd.parsePreprocessEval = parsePreprocessEval
// parsePreprocessEval.async = async function(source, cmdset) {
//   let parseTreePromise = parse(source, cmdset)
//   let prepPromise = parseTreePromise.then(parseTree => preprocess(parseTree, cmdset))
//   return prepPromise.then(() => evaluate(, cmdset))
// }
  
  /**
  body.querySelectorAll('.txtcmd-element[data-cmdset]').map(elem => renderElement(elem))
  renderElement(elem)
    Takes an element elem and converts its innerText into a textcmd commands using the configured commandset OR
    the element's data-cmdset attribute to get the commandset to use. Note: data-cmdset="var" should specify
    the globalThis variable name 'var' for the cmdset variable
    commandset OR the default commandset
  renderElement(elem, cmdset)
    Like renderElement(elem) but uses cmdset for the commandset
  Replaces element's contents
  */
  function renderElement(elem, cmdsetArg = undefined) {
    if(!(elem ?? false))
      throw Error(`renderElement given undefined element as first argument`)
    let cmdset
    if(cmdsetArg !== undefined)
      cmdset = cmdsetArg
    else if(defaultCmdset !== undefined)
      cmdset = defaultCmdset
    else if('cmdset' in elem.dataset)
      cmdset = globalThis[elem.dataset.cmdset]
    else
      throw Error('No command set found')
    let source = elem.innerText
    elem.innerHTML = ''
    const oldClasses = elem.classList
    let newElem = parsePreprocessEval(source, cmdset)
    newElem.classList.add(...oldClasses)
    newElem.classList.add('tc-rendered')
    elem.replaceWith(newElem)
  }
  txtcmd.renderElement = renderElement
  
  let autorenderingState = false
  let autorenderMutationObserver = undefined
  function setAutorendering(onOff = false) {
    if(autorenderingState) { // currently on
      if(!onOff) { // turn off
        autorenderMutationObserver.disconnect()
        autorenderMutationObserver = undefined
        autorenderingState = false
      }
    } else { // currently off
      if(onOff) { // turn on
        // Mutation observer for node add events (primarily to check for recursion)
        autorenderMutationObserver = new MutationObserver((mutationList, _observer) => {
          for(const mutation of mutationList) if(mutation.type == 'childList') for(const child of mutation.addedNodes) {
            applyToThisAndDescendants(child, e => {
              if('classList' in e && e.classList.contains('tc-autorender') && !e.classList.contains('tc-rendered'))
                requestIdleCallback(()=>renderElement(e))
            })
          }
        })
        autorenderMutationObserver.observe(document, {childList: true, subtree: true})
        for(const elementToRender of document.querySelectorAll('.tc-autorender:not(.tc-rendered)'))
          requestIdleCallback(()=>renderElement(elementToRender))
        autorenderingState = true
      }
    }
  }
}
__txtcmdLoader()