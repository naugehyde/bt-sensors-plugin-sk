import Form from '@rjsf/core' ;
import { getWidget } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import {render} from 'react-dom';
import React from 'react'
import {useEffect, useState} from 'react'
import {default as BS} from 'react-bootstrap/Form';

const log = (type) => console.log.bind(console, type);

import ListGroup from 'react-bootstrap/ListGroup';



export default (props) => {

  const [baseSchema, setBaseSchema] = useState({})
  const [baseData, setBaseData] = useState({})

  const [schema, setSchema] = useState({}) 
  var [refresh, setRefresh] = useState(true)

  const [sensorData, setSensorData] = useState({})
  var [ sensorMap, setSensorMap ] = useState(new Map())


  function sendJSONData(cmd, data){
    console.log(`sending ${cmd}`)
    console.log(data)
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    fetch(`/plugins/bt-sensors-plugin-sk/${cmd}`, {
      credentials: 'include',
      method: 'POST',
	    body: JSON.stringify(data),
      headers:headers
    }).then((response)=>{
      if (response.status != 200) {
        throw new Error(response.status)
      }  
      console.log(response)
    })
  }

  async function getJSONData(path){
    console.log(`fetching ${path}`)

    const response = await fetch(`/plugins/bt-sensors-plugin-sk/${path}`, {
      credentials: 'include'
    })
    if (response.status != 200) {
      throw new Error(response.status)
    }  

    const json = await response.json()
    console.log(json)
    return json
  }


  async function getSensorData(){
    return getJSONData("sensors")
  }

  async function getBaseData(){
    return getJSONData("base")
  }

  function sendSensorData(data){
    sendJSONData("sendSensorData", data)
  }

  function sendBaseData(data){
    sendJSONData("sendBaseData", data)
  }

  useEffect(()=>{
    
    getBaseData().then(async (json) => {
      setBaseSchema(json.schema);    
      setBaseData(json.data);    
    })
  },[])

  useEffect( ()=>{
    getSensorData().then((sensors)=>{
      sensorMap = new Map(sensors.map((sensor)=>[sensor.sensor.mac,sensor]))
      setSensorMap(sensorMap);    
    })

  },[])

  useEffect(()=>{
      console.log("Setting up eventsource")
      const eventSource = new EventSource("/plugins/bt-sensors-plugin-sk/sse")

      eventSource.addEventListener("newsensor", (event) => {
      let json = JSON.parse(event.data)
      if (!sensorMap.has(json.sensor.mac)) {
        console.log(`New sensor: ${json.sensor.mac}`)
        setSensorMap(new Map ( sensorMap.set(json.sensor.mac, json)))
      }
    });
      eventSource.addEventListener("sensordisplayname", (event) => {
        let json = JSON.parse(event.data)
        if (sensorMap.has(json.mac)) {
          console.log(`Updating display name of ${json.mac}`)
          let sensor = sensorMap.get(json.mac)
          sensor.sensor.name=json.name
          setSensorMap(new Map ( sensorMap ))
        }
    });
    eventSource.addEventListener("pluginRestarted", (event) => {
      getSensorData().then((sensors)=>{
        sensorMap = new Map(sensors.map((sensor)=>[sensor.sensor.mac,sensor]))
        setSensorMap(sensorMap);    
      }
      )
    })
    
    return () => eventSource.close();

},[])
 


  return(
    <div>
      <div>
      <Form
        schema={baseSchema}
        validator={validator}
        onChange={(e) => setBaseData(e.formData)}
        onSubmit={ ({ formData }, e) => sendBaseData(formData) }
        onError={log('errors')}
        formData={baseData}
      />
      <p></p>
      <p></p>
      <div style={{maxwidth: '50px'}}>
      <BS.Select size="lg"
        onChange = {(e)=> 
          {
            const data = sensorMap.get(e.target.value).config
            data.mac_address=e.target.value
            setSchema(sensorMap.get(e.target.value).schema)
            setSensorData(data)
          }
        }>
      {Array.from(sensorMap.entries()).map((entry) =>  
        <option key={entry[0]} value={entry[0]}> 
          {entry[1].sensor.name}
        </option>         
      )
      }
      </BS.Select>
      </div>
      <p></p>
      <p></p>
      </div>
      
      <Form
        schema={schema}
        validator={validator}
        onChange={(e) => setSensorData(e.formData)}
        onSubmit={({ formData }, e) => {
          console.log(formData) 
          sendSensorData(formData)}}
        onError={log('errors')}
        formData={sensorData}
      />  
    </div>
  )
    
}