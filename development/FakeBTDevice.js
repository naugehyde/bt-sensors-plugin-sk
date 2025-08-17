import { EventEmitter } from "events";
export class FakeGATTServer{
  constructor(services){
    this.services=services
  }
  getPrimaryService (uuid){
    return this.services.find((service)=>{return service.uuid==uuid})
  }
}

export class FakeGATTService{
  constructor(uuid, characteristics=[]){
    this.uuid=uuid
    this.characteristics=characteristics
  }
  getCharacteristic (uuid){
    return this.characteristics.find((characteristic)=>{return characteristic.uuid==uuid})
  }
}

export class FakeGATTCharacteristic extends EventEmitter{
  constructor(uuid, values=[], interval=1000){
    super()
    this.uuid=uuid
    this.valueIndex=0
    this.values=values
    this.interval = interval
  }
  startNotifications(){
      this.intervalID=setInterval(()=>{
      if (this.values.length>0){
        this.emit("valuechanged",Buffer.from(this.values[this.valueIndex++],"hex") )
        if (this.valueIndex>=this.values.length)
          this.valueIndex=0
      }
    },this.interval)

  }
  stopNotifications(){
    this.clearInterval(this.intervalID)
  }
}

export class FakeDevice{
  constructor(services=[]){
    this.gattServer=new FakeGATTServer(services)
  }
  connect(){
    return this
  }
  gatt(){
    return this.gattServer
  }
  disconnect(){

  }
}
