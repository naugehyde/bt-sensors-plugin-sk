import Form from '@rjsf/core' ;
import validator from '@rjsf/validator-ajv8';
import {render} from 'react-dom';

const log = (type) => console.log.bind(console, type);
var schema={};
  fetch('/plugins/bt-sensors-plugin-sk/config', {
      credentials: 'include'
    }).then(response => {
      if (response.status != 200) {
        throw new Error(response.status)
      }
      return response.json()
    }).then(schema => {
      console.log(schema)
      render(
        <Form
          schema={schema}
          validator={validator}
          onChange={log('changed')}
          onSubmit={log('submitted')}
          onError={log('errors')}
        />,
        document.getElementById('app')
      );
      
    }).catch(err => {
      window.alert('Could not get bluetooth configuration:' + err)
    })

