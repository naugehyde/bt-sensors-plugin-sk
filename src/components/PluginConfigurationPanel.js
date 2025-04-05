import Form from '@rjsf/core' ;
import { getWidget } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import {render} from 'react-dom';
import React from 'react'
import {useEffect, useState} from 'react'
import {default as BS} from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

const log = (type) => console.log.bind(console, type);

import ListGroup from 'react-bootstrap/ListGroup';
import { ListGroupItem } from 'react-bootstrap';



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
    /*eventSource.addEventListener("pluginRestarted", (event) => {
      setSensorMap(new Map());    
    })*/

    eventSource.addEventListener("resetSensors", (event) => {
      sensorMap = new Map()
      setSensorMap(sensorMap);
      setSchema({})    
    })
    
    return () => eventSource.close();

},[])
 function deleteConfig(mac){

}
function sensorList(type){

  if (type=="LG")
    return(

      <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {Array.from(sensorMap.entries()).map((entry) =>  
 
          <ListGroupItem action 
          onClick={(e)=>{ 
            const data = sensorMap.get(entry[0]).config;
            data.mac_address=entry[0]
            setSchema(sensorMap.get(entry[0]).schema)
            setSensorData(data)
          }
          }> 
          <div  class="d-flex justify-content-between align-items-center" style={Object.keys(sensorMap.get(entry[0]).config).length?{fontWeight:"normal"}:{fontStyle:"italic"}}>
          {entry[1].sensor.name}
          <div class="d-flex justify-content-between ">
    
          <Button onClick={deleteConfig(entry[0])}>
          <FontAwesomeIcon icon="fa-sharp-duotone fa-solid fa-house" swapOpacity />
          

          </Button>

          </div>
          </div>
          </ListGroupItem>

      )}
      
      </ListGroup>
    )

}
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
      <div>
        {sensorList("LG")}
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