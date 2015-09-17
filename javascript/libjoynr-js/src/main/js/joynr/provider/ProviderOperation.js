/*
 * #%L
 * %%
 * Copyright (C) 2011 - 2015 BMW Car IT GmbH
 * %%
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * #L%
 */

define(
        "joynr/provider/ProviderOperation",
        [],

        function() {

            /**
             * Checks if the given argumentDatatypes and arguments match the given operationSignature
             *
             * @name ProviderOperation#getNamedArguments
             * @function
             * @private
             *
             * @param {Array}
             *            unnamedArguments an array containing the arguments, e.g. [1234, "asdf"]
             * @param {?}
             *            unnamedArguments.array the argument value
             * @param {Array}
             *            argumentDatatypes an array containing the datatypes,
             *            e.g. ["Integer", "String"]
             * @param {String}
             *            argumentDatatypes.array the datatype in string format
             * @param {Object}
             *            operationSignature an object with the argument name as key and an object
             *            as value defining the type, e.g.
             *            { nr: {type : "Integer"}, str: {type: "String"} }
             * @param {Object}
             *            operationSignature.PARAMETERNAME an object describing the single parameter
             * @param {String}
             *            operationSignature.PARAMETERNAME.type the type of the parameter
             *
             * @returns undefined if argumentDatatypes does not match operationSignature or a map
             *            containing a named argument map, e.g. &#123;nr: 1234,str: "asdf"&#125;
             */
            function getNamedArguments(unnamedArguments, argumentDatatypes, operationSignature) {
                var i, argument, argumentName, namedArguments = {};

                // check if number of given argument types (argumentDatatypes.length) matches number
                // of parameters in op signature (keys.length)
                if (argumentDatatypes.length !== operationSignature.length) {
                    return undefined;
                }

                // cycle over all arguments
                for (i = 0; i < argumentDatatypes.length; ++i) {
                    argument = operationSignature[i];
                    argumentName = argument.name;
                    // check if argument type matches parameter's type from operation signature
                    if (argumentDatatypes[i] !== argument.type) {
                        return undefined;
                    }

                    // put argument value into named arguments map
                    namedArguments[argumentName] = unnamedArguments[i];
                }

                return namedArguments;
            }

            /**
             * Constructor of ProviderAttribute object that is used in the generation of provider
             * objects
             *
             * @name ProviderOperation
             * @constructor
             *
             * @param {Provider}
             *            parent the provider object
             *
             * @param {Object}
             *            [implementation] the operation function
             *
             * @param {String}
             *            operationName the name of the operation
             *
             * @param {Array}
             *            operationSignatures an object with the argument name as key and an object
             *            as value defining the type
             * @param {Object}
             *            operationSignatures.array an object with the argument name as key and an
             *            object as value defining the type
             * @param {Object}
             *            operationSignatures.array.PARAMETERNAME an object describing the single
             *            parameter
             * @param {String}
             *            operationSignatures.array.PARAMETERNAME.type the type of the parameter
             */
            function ProviderOperation(parent, implementation, operationName, operationSignatures) {
                if (!(this instanceof ProviderOperation)) {
                    // in case someone calls constructor without new keyword
                    // (e.g. var c = Constructor({..}))
                    return new ProviderOperation(
                            parent,
                            implementation,
                            operationName,
                            operationSignatures);
                }

                var privateOperationFunc = implementation;

                /**
                 * Registers the operation function
                 *
                 * @name ProviderOperation#registerOperation
                 * @function
                 *
                 * @param {Function}
                 *            operationFunc registers the operation function
                 */
                this.registerOperation = function registerOperation(operationFunc) {
                    privateOperationFunc = operationFunc;
                };

                /**
                 * Calls the operation function.
                 *
                 * @name ProviderOperation#callOperation
                 * @function
                 *
                 * @param {Array}
                 *            operationArguments the operation arguments as an array
                 * @param {?}
                 *            operationArguments the operation argument value, e.g. 1
                 * @param {Array}
                 *            operationArgumentTypes the operation argument types as an array
                 * @param {String}
                 *            operationArgumentTypes the operation argument type in String form
                 *            e.g. "Integer"
                 *
                 * @returns {?} the return type of the called operation function
                 */
                this.callOperation =
                        function callOperation(operationArguments, operationArgumentTypes) {
                            var i;
                            var namedArguments;

                            // cycle through multiple available operation signatures
                            for (i = 0; i < operationSignatures.length
                                && namedArguments === undefined; ++i) {
                                // check if the parameters from the operation signature is valid for
                                // the provided arguments
                                namedArguments =
                                        getNamedArguments(
                                                operationArguments,
                                                operationArgumentTypes,
                                                operationSignatures[i]);
                            }

                            // check if a matching operation signature was found
                            if (namedArguments === undefined) {
                                // TODO: proper error handling
                                throw new Error("Could not find a valid operation signature in '"
                                    + JSON.stringify(operationSignatures)
                                    + "' for a call to operation '"
                                    + operationName
                                    + "' with the arguments: '"
                                    + JSON.stringify(operationArguments)
                                    + "'");
                            }

                            // eventually, call the operation function
                            return privateOperationFunc(namedArguments);
                        };

                /**
                 * Check if the registered operation is defined.
                 * @function ProviderOperation#checkOperation
                 * @returns {Boolean}
                 */
                this.checkOperation = function checkOperation() {
                    return typeof privateOperationFunc === "function";
                };

                return Object.freeze(this);
            }

            return ProviderOperation;

        });