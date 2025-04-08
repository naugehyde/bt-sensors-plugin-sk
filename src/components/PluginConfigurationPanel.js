import Form from '@rjsf/core' ;
import validator from '@rjsf/validator-ajv8';
import React from 'react'
import {useEffect, useState} from 'react'
import Button from 'react-bootstrap/Button'

import Spinner from 'react-bootstrap/Spinner'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

const log = (type) => console.log.bind(console, type);

import ListGroup from 'react-bootstrap/ListGroup';
import { ListGroupItem } from 'react-bootstrap';

var _sensorMap

export default (props) => {

  const hideSubmit= {
    'ui:submitButtonOptions': {
      props: {
        disabled: false,
        className: 'btn btn-info',
      },
      norender: true,
      submitText: 'Submit',
    },
  }
  const showSubmit= {
    'ui:submitButtonOptions': {
      props: {
        disabled: false,
        className: 'btn btn-info',
      },
      norender: false,
      submitText: 'Submit',
    },
  }
  const [baseSchema, setBaseSchema] = useState({})
  const [baseData, setBaseData] = useState({})

  const [schema, setSchema] = useState({}) 
  const [ uiSchema, setUISchema] = useState(hideSubmit )
  const [sensorList, setSensorList] = useState([])

  const [sensorData, setSensorData] = useState({})
  const [sensorMap, setSensorMap ] = useState(new Map() )

  const [isLoading, setIsLoading ] = useState(true)
 
  function sendJSONData(cmd, data){

    console.log(`sending ${cmd}`)
    console.log(data)
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    return fetch(`/plugins/bt-sensors-plugin-sk/${cmd}`, {
      credentials: 'include',
      method: 'POST',
	    body: JSON.stringify(data),
      headers:headers
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

  function updateSensorData(data){
    sendJSONData("sendSensorData", data).then((response)=>{
      if (response.status != 200) {
        throw new Error(response.status)
      } 
    })
  }

  function removeSensorData(mac){
    try{ 
    
      sendJSONData("removeSensorData", {mac_address:mac} ).then((response)=>{
        if (response.status != 200) {
            throw new Error(response.status)
        }
        })

        _sensorMap.delete(mac)
        
        setSensorMap(new Map(_sensorMap))
        setSchema({})
    } catch {(e)=>
      console.log(`Couldn't remove ${mac}: ${e}`)
    }
     
  }


  function updateBaseData(data){
    sendJSONData("sendBaseData", data).then( (response )=>{
        if (response.status != 200) {
          throw new Error(response.status)
        } else{
          refreshSensors()
        }
      })

    }

  function refreshSensors(){
    console.log('refreshing sensor map')

    getSensorData().then((sensors)=>{
      setSensorMap (new Map(sensors.map((sensor)=>[sensor.sensor.mac,sensor])));    
    })
  }


  useEffect(()=>{
      console.log("Setting up eventsource")
      const eventSource = new EventSource("/plugins/bt-sensors-plugin-sk/sse")
      
      eventSource.addEventListener("newsensor", (event) => {
        let json = JSON.parse(event.data)
        
        if (!_sensorMap.has(json.sensor.mac)) {
          console.log(`New sensor: ${json.sensor.mac}`)
          setSensorMap(new Map(_sensorMap.set(json.sensor.mac, json)))
        }
      });

      eventSource.addEventListener("sensordisplayname", (event) => {
        let json = JSON.parse(event.data)        
        
        if (_sensorMap.has(json.mac)) {
          let sensor = _sensorMap.get(json.mac)
          sensor.sensor.name=json.name
          setSensorMap(new Map ( _sensorMap ))
        }
      });
      
      refreshSensors()
      
      getBaseData().then(async (json) => {
        setBaseSchema(json.schema);    
        setBaseData(json.data);
      })
    return () => eventSource.close();

},[])

function confirmRemove(mac){
  const result = window.confirm(`Remove configuration for ${mac}?`)
  if (result)
    removeSensorData(mac)
}


 
useEffect(()=>{
    _sensorMap = sensorMap
    
    setIsLoading(_sensorMap.size==0)
    setSensorList(
      
      Array.from(sensorMap.entries()).map((entry) =>  {
        const config=sensorMap.get(entry[0]).config
        const hasConfig = Object.keys(config).length>0;
        var b="";
        if (hasConfig){
          b = <Button onClick={
            ()=>{        
              confirmRemove(entry[0])
            }
          }>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
          }
      return <ListGroupItem action 
        onClick={()=>{ 
          if (sensorMap.get(entry[0])){
            config.mac_address=entry[0]
            setSchema(sensorMap.get(entry[0]).schema)
            setSensorData(config)
            setUISchema(showSubmit)
          }
        }
        }> 
        <div  class="d-flex justify-content-between align-items-center" style={hasConfig?{fontWeight:"normal"}:{fontStyle:"italic"}}>
        {entry[1].sensor.name}
        <div class="d-flex justify-content-between ">
          { b }
        </div>
        </div>
        </ListGroupItem>
    }) 
    )
   
  },[sensorMap]
  )


  return(
    <div>
      <Form 
        schema={baseSchema}
        validator={validator}
        onChange={(e) => setBaseData(e.formData)}
        onSubmit={ ({ formData }, e) => {setSchema({}); setUISchema(hideSubmit); updateBaseData(formData) }}
        onError={log('errors')}
        formData={baseData}
      />
      <p></p>
      <p></p>
      <h2>Bluetooth Devices - Select to Configure</h2>
      <p></p>
          {isLoading?
           <Button variant="primary" disabled>
           <Spinner
             as="span"
             animation="border"
             size="sm"
             role="status"
             aria-hidden="true"
           />
           Loading...
         </Button>:
          <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {sensorList}
          </ListGroup>
          }
      <p></p>
      <p></p>
      
      <Form
        schema={schema}
        validator={validator}
        uiSchema={uiSchema}
        onChange={(e) => setSensorData(e.formData)}
        onSubmit={({ formData }, e) => {
          console.log(formData) 
          updateSensorData(formData)}}
        onError={log('errors')}
        formData={sensorData}
      />  
    </div>
  )
    

  }