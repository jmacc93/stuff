

/*
License: MIT
Original author: Joe M
400766f8f9b4b14f38b5a318bf221b6d2d6794e39adda29f6158da0ef807aa0bf7951380636354f43b9a43cb8620b9243216a44ccdd6dca1af576b4c0448049d
*/

const head = document.head


let waitOnHeadTimeout = undefined
let initialHeadWaitTime = Date.now()
function btcExecuteOnHead() {
  if(head === undefined || head === null) {
    console.log("waiting for head")
    if(Date.now() - initialHeadWaitTime > 1000*10) // waited too long
      return void 0
    waitOnHeadTimeout = setTimeout(() => btcExecuteOnHead, 5)
    return void 0
  }
  // else:
  clearTimeout(waitOnHeadTimeout)
  
  function elementThen(tag, fn = undefined) {
    let ret = document.createElement(tag)
    fn?.(ret)
    return ret
  }

  function makeScript(src) {
    return elementThen('script', script => {
      script.setAttribute('src', src)
      script.setAttribute('type', 'text/javascript')
    })
  }
  function makeStyle(src) {
    return elementThen('link', link => {
      link.setAttribute('rel', 'stylesheet')
      link.setAttribute('href', src)
    })
  }

  head.appendChild(makeScript('/stuff/lib/textcmd.js'))
  head.appendChild(makeScript('/stuff/lib/basic-textcmds.js'))
  head.appendChild(makeStyle( '/stuff/lib/basic-textcmds.css'))

  // Wait for txtcmd and basicCmdset to be loaded
  let configurationTimeout = undefined
  let initialConfigurationWaitTime = Date.now()
  function configurationFunction() {
    if(typeof txtcmd !== 'undefined' && typeof basicCmdset !== 'undefined') {
      txtcmd.configure({
        autoRender: true,
        defaultCmdset: basicCmdset
      })
      clearTimeout(configurationTimeout)
    } else if(Date.now() - initialConfigurationWaitTime > 1000*10) { // waited too long
      console.error('waiting for txtcmd and basicCmdset stopped')
      return void 0
    } else {
      configurationTimeout = setTimeout(() => configurationFunction(), 5)
    }
  }
  configurationFunction()
}
btcExecuteOnHead()