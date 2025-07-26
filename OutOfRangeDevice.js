
class OutOfRangeDevice extends EventEmitter{
    constructor(adapter, mac){
        this.helper=new EventEmitter()
        this.helper._prepare=()=>{}
        this.helper.callMethod=()=>{}

        this._propsProxy={}
        this._propsProxy.GetAll=()=>{return {}}
        this._propsProxy.Get=()=>{return null}
        
    }
    connect(){}
    disconnect(){}

}