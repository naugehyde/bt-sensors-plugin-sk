
const EventEmitter = require('node:events');

class OutOfRangeDevice extends EventEmitter{
    constructor(adapter, config){
        super()
        this.helper=new EventEmitter()
        this.helper._prepare=()=>{}
        this.helper.callMethod=()=>{}
        this.helper.removeListeners=(()=>{this.removeAllListeners()}).bind(this.helper)
        let props={Address: {value:config.mac_address}}
        this._propsProxy={}
        this._propsProxy.GetAll=()=>{
            return props
        }
        this._propsProxy.Get=(key)=>{
            if(key==="Address") 
                return props.Address 
            else return null
        }

        this.intervalID=setInterval(
            ()=>{
			adapter.waitDevice(config.mac_address,(config?.discoveryTimeout??30)*1000)
			.then( (device)=> { 
                this.emit("deviceFound", device)
                clearInterval(this.intervalID)
                this.intervalID=undefined
            }).catch((e)=>{
                
            })
            },
            (config?.discoveryTimeout??30)*1000
        )
        
    }
    connect(){}
    disconnect(){}
    stopListening(){
        this.removeAllListeners()
        if (this.intervalID)
            clearInterval(this.intervalID)
    }
}
module.exports=OutOfRangeDevice