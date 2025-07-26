
class OutOfRangeDevice extends EventEmitter{
    constructor(adapter, config){
        this.helper=new EventEmitter()
        this.helper._prepare=()=>{}
        this.helper.callMethod=()=>{}

        this._propsProxy={}
        this._propsProxy.GetAll=()=>{return {}}
        this._propsProxy.Get=()=>{return null}

        this.intervalID=setInterval(
            ()=>{
			adapter.waitDevice(config.mac_address,(config?.discoveryTimeout??30)*1000)
			.then(async (device)=> { 
                
            })
            },
            (config?.discoveryTimeout??30)*1000
        )
        
    }
    connect(){}
    disconnect(){}
    stopListening(){
        clearInterval(this.intervalID)
    }
}