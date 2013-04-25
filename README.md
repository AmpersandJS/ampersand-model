# StrictModel

Strict models are a drop-in replacement for Backbone models but are far more restrictive. Backbone models have a lot of flexibility in that you don't have to define what you're wanting to store ahead of time. 

The only challenge with that is that for more complex applications is actually becomes quite tricky to remember what properties are available to you.

Using strict models means they're much more self-documenting. Someone new to the progress can read the models and have a pretty good idea of how the app is put together.

## Key Differences from BackBone models

- All properties have to be defined in code and given at minimum a type.
- 


## Defining properties

Schema definitions can take an attribute called `props` to defined properties.
Property names can be defined two different ways, either an array with `[type, required, default]`,
or an object: `{ type: 'string', required: true, default: '' }`

Type: `string`, `number`, `boolean`, `array`, `object`, or `date`
Required: true, false (optional)
Default: any (optional)

```js
props: {
  firstName: ['string', true, 'Jim']
  lastName: {
    type: 'string'
  , required: false
  , default: 'Bob' 
  }
}
```
