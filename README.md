
StrictModel
===========


Defining properties
-------------------

Schema definitions can take an attribute called `props` to defined properties.
Property names can be defined two different ways, either an array with `[type, required, default]`,
or an object: `{ type: 'string', required: true, default: '' }`

Type: `string`, `number`, `boolean`, `array`, `object`, or `date`
Required: true, false (optional)
Default: any (optional)

``` js
props: {
  firstName: ['string', true, 'Jim']
  lastName: {
    type: 'string'
  , required: false
  , default: 'Bob' 
  }
}
```