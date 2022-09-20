

function elementThen(tag, fn = undefined) {
  let ret = document.createElement(tag)
  fn?.(ret)
  return ret
}
function plaintextElement(tag, text) {
  let ret = document.createElement(tag)
  if(!(text ?? false)) // text is null or undefined
    return undefined
  else if(typeof text === 'string')
    ret.innerText = text
  else
    ret.innerText = String(text)
  return ret
}

/**
asString(obj) turns obj into a string as best it can
*/
function asString(obj) {
  if(!(obj ?? false)) // null or undefined
    return undefined
  else if(obj instanceof HTMLElement) {
    return obj.innerText
  } else if(typeof obj === 'string') {
    return obj
  } else if(Array.isArray(obj)) {
    if(obj.length === 1)
      return asString(obj[0])
    else
      return String(obj.join(', '))
  } else {
    return String(obj)
  }
}

function addMoreTxtcmds() {
  
  console.log("Added extra textcmds")
  
  basicCmdset.title = {
    evaluate: (arg) => {
      let titleElement = document.head.querySelector('title')
      if(titleElement ?? false) // is defined:
        title.innerText = asString(arg)
      else // not defined, just add it:
        document.head.appendChild(plaintextElement('title', asString(arg)))
      return null
    }
  }
  
}


// Wait for txtcmd and basicCmdset to be loaded (from btc-loader.js)
let configurationTimeout = undefined
let initialConfigurationWaitTime = Date.now()
function configurationFunction() {
  if(typeof txtcmd !== 'undefined' && typeof basicCmdset !== 'undefined') {
    addMoreTxtcmds()
    clearTimeout(configurationTimeout)
  } else if(Date.now() - initialConfigurationWaitTime > 1000*10) { // waited too long
    console.error('waiting for txtcmd and basicCmdset stopped')
    return void 0
  } else {
    configurationTimeout = setTimeout(() => configurationFunction(), 5)
  }
}
configurationFunction()