# Mind Lake Typescript SDK

An Typescript implementation for Mind Lake

## Description

The Mind Lake SDK utilizes Mind Lake's encryption storage and privacy computing capabilities to provide secure data management. 
* Mind Lake is the backbone of Mind Network. 
* All data is end-to-end encrypted at the client-side SDK side, ensuring that plaintext data never leaves the user's client. 
* Cryptographic principles ensure that only the data owner can access their own plaintext data. 
* Additionally, Mind Lake's powerful privacy computing capabilities enable the performance of calculations and querying of encrypted data.

## Getting Started

### Dependencies

* node [16, 18)
* web3js

### Installing

```
$ npm install --save mind-lake-sdk
# or
$ yarn add mind-lake-sdk
```

### Import 
```
import { MindLake } from "mind-lake-sdk";
const mindLake = await MindLake.getInstance("YOUR OWN APP KEY")
...
```

### Executing program
* [step-by-step tutorial](/tutorial/README.md)
* [quick starts](https://mind-network.gitbook.io/mind-lake-sdk/get-started)
* [more examples](https://mind-network.gitbook.io/mind-lake-sdk/use-cases)


## code
```
mind-lake-sdk-typescript
|-- src # source code
|   |-- MindLake.ts
|   |-- DataLake.ts
|   |-- Permission.ts
|   |-- Cryptor.ts
|-- tests # unit test code
|-- examples # use case examples
|-- tutorial # step-by-step tutorial
|-- README.md
└--- LICENSE

```

## Help

Full doc: [https://mind-network.gitbook.io/mind-lake-sdk](https://mind-network.gitbook.io/mind-lake-sdk) 

## Authors
* Joshua [@JoshuaW55818202](https://twitter.com/JoshuaW55818202)
* Lee [@LeeTan853917](https://twitter.com/LeeTan853917)

## Version History

* v1.0.0
    * Initial Release
* v1.0.1
    * Fix bug
* v1.0.2
    * Fix bug    
* v1.0.4
    * Add listOwner method to Permission Class
    * Add listOwnerColumn method to Permission Class
## License

This project is licensed under the [MIT] License - see the LICENSE.md file for details
