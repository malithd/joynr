/*jslint es5: true */

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

/**
 * The <code>CapabilityDiscovery</code> is a joynr internal interface. When the Arbitrator does a lookup for capabilities, this module is
 * queried. If a provider needs to be registered, this module selects the places to register at.
 */
define(
        "joynr/capabilities/discovery/CapabilityDiscovery",
        [
            "global/Promise",
            "joynr/types/CapabilityInformation",
            "joynr/system/routingtypes/ChannelAddress",
            "joynr/types/DiscoveryEntry",
            "joynr/types/DiscoveryQos",
            "joynr/types/DiscoveryScope",
            "joynr/types/ProviderScope",
            "joynr/infrastructure/GlobalCapabilitiesDirectoryProxy",
            "joynr/system/LoggerFactory"
        ],
        function(
                Promise,
                CapabilityInformation,
                ChannelAddress,
                DiscoveryEntry,
                DiscoveryQos,
                DiscoveryScope,
                ProviderScope,
                GlobalCapabilitiesDirectoryProxy,
                LoggerFactory) {

            /**
             * The CapabilitiesDiscovery looks up the local and global capabilities directory
             *
             * @constructor
             * @name CapabilityDiscovery
             *
             * @param {CapabilitiesStore}
             *            localCapabilitiesStore the local capabilities store
             * @param {CapabilitiesStore}
             *            globalCapabilitiesCache the cache for the global capabilities directory
             * @param {MessageRouter}
             *            messageRouter the message router
             * @param {ProxyBuilder}
             *            proxyBuilder the proxy builder used to create the GlobalCapabilitiesDirectoryProxy
             * @param {String}
             *            localChannelId the local channel Id
             * @param {String}
             *            globalCapabilitiesDomain the domain to communicate with the GlobalCapablitiesDirectory
             *                                     GlobalCapab
             *
             */
            function CapabilityDiscovery(
                    localCapabilitiesStore,
                    globalCapabilitiesCache,
                    messageRouter,
                    proxyBuilder,
                    localChannelId,
                    globalCapabilitiesDomain) {
                var log =
                        LoggerFactory.getLogger("joynr/capabilities/discovery/CapabilityDiscovery");
                var TTL_30DAYS_IN_MS = 30*24*60*60*1000;

                if (!localCapabilitiesStore
                    || !localCapabilitiesStore.lookup
                    || !localCapabilitiesStore.add
                    || !localCapabilitiesStore.remove) {
                    throw new Error(
                            "constructor of CapabilityDiscovery requires the localCapabilitiesStore as argument");
                }

                if (!globalCapabilitiesCache
                    || !globalCapabilitiesCache.lookup
                    || !globalCapabilitiesCache.add
                    || !globalCapabilitiesCache.remove) {
                    throw new Error(
                            "constructor of CapabilityDiscovery requires the globalCapabilitiesCache as argument");
                }

                if (!messageRouter || !(messageRouter.addNextHop)) {
                    throw new Error(
                            "constructor of CapabilityDiscovery requires the messageRouter as argument");
                }

                if (proxyBuilder === undefined) {
                    throw new Error(
                            "constructor of CapabilityDiscovery requires the proxyBuilder as argument");
                }

                if (localChannelId === undefined) {
                    throw new Error(
                            "constructor of CapabilityDiscovery requires the local channelId");
                }

                if (globalCapabilitiesDomain === undefined) {
                    throw new Error(
                            "constructor of CapabilityDiscovery requires the globalCapabilitiesDomain");
                }

                /**
                 * This method transforms a discoveryEntry into an object of type "CapabilityInformation"
                 *
                 * @function
                 * @name CapabilityDiscovery#toCapabilityInformation
                 *
                 * @param {DiscoveryEntry}
                 *            discoveryEntry the object to be transformed
                 *
                 * @returns {CapabilityInformation} the transformed object
                 */
                function toCapabilityInformation(discoveryEntry) {
                    return new CapabilityInformation({
                        domain : discoveryEntry.domain,
                        interfaceName : discoveryEntry.interfaceName,
                        providerQos : discoveryEntry.qos,
                        channelId : localChannelId,
                        participantId : discoveryEntry.participantId
                    });
                }

                /**
                 * This method transforms a capabilityInformation into an object of type "DiscoveryEntry"
                 *
                 * @function
                 * @name CapabilityDiscovery#toDiscoveryEntry
                 *
                 * @param {CapabilityInformation}
                 *            capabilityInformation the object to be transformed
                 *
                 * @returns {DiscoveryEntry} the transformed object
                 */
                function toDiscoveryEntry(capabilityInformation) {
                    return new DiscoveryEntry({
                        domain : capabilityInformation.domain,
                        interfaceName : capabilityInformation.interfaceName,
                        qos : capabilityInformation.providerQos,
                        participantId : capabilityInformation.participantId,
                        connections : []
                    });
                }

                /**
                 * This method create a new global capabilities proxy with the provided ttl as messaging QoS
                 *
                 * @function
                 * @name CapabilityDiscovery#getGlobalCapabilitiesDirectoryProxy
                 *
                 * @param {Number}
                 *            ttl time to live of joynr messages triggered by the returning proxy
                 *
                 * @returns {GlobalCapabilitiesDirectoryProxy} the newly created proxy
                 *
                 */
                function getGlobalCapabilitiesDirectoryProxy(ttl) {
                    return proxyBuilder.build(GlobalCapabilitiesDirectoryProxy, {
                        domain : globalCapabilitiesDomain,
                        messagingQos : {
                            ttl: ttl
                        },
                        discoveryQos : new DiscoveryQos({
                            discoveryScope : DiscoveryScope.LOCAL_ONLY
                        })
                    }).catch(function(error) {
                        throw new Error("Failed to create global capabilities directory proxy: " + error);
                    });
                }

                /**
                 * expects a capabilities array which is then filled with any that are found from the proxy
                 *
                 * @function
                 * @name CapabilityDiscovery#lookupGlobalCapabilities
                 *
                 * @param {String} domain - the domain
                 * @param {String} interfaceName - the interface name
                 * @param {Number} ttl - time to live of joynr messages triggered by the returning proxy
                 * @param {Array} capabilities - the capabilities array to be filled
                 *
                 * @returns {Array} - the capabilities array filled with the capabilities found in the global capabilities directory
                 */
                function lookupGlobalCapabilities(domain, interfaceName, ttl, capabilities) {
                    return getGlobalCapabilitiesDirectoryProxy(ttl).then(function(globalCapabilitiesDirectoryProxy){
                        return globalCapabilitiesDirectoryProxy.lookup({
                            domain : domain,
                            interfaceName : interfaceName
                        }).then(function(globalCapabilities) {
                            var i, messageRouterPromises = [];
                            for (i = globalCapabilities.length - 1; i >= 0; i--) {
                                var capabilityInformation = globalCapabilities[i];
                                if (capabilityInformation.channelId === localChannelId) {
                                    globalCapabilities.splice(i, 1);
                                } else {
                                    // Update routing table
                                    messageRouterPromises.push(messageRouter.addNextHop(
                                            capabilityInformation.participantId,
                                            new ChannelAddress(
                                                    {
                                                        channelId : capabilityInformation.channelId
                                                    })));
                                    capabilities.push(toDiscoveryEntry(capabilityInformation));
                                }
                            }
                            return Promise.all(messageRouterPromises).then(function() {
                                return capabilities;
                            });
                        });
                    });
                }

                /**
                 * This method queries the local and/or global capabilities directory according to the given discoveryStrategy given in the
                 * DiscoveryQos object
                 *
                 * @function
                 * @name CapabilityDiscovery#lookup
                 *
                 * @param {String}
                 *            domain the domain
                 * @param {String}
                 *            interfaceName the interface name
                 * @param {DiscoveryQos}
                 *            discoveryQos the DiscoveryQos giving the strategy for discovering a capability
                 * @param {DiscoveryScope}
                 *            dDiscoveryQos.discoveryScope the strategy to discover capabilities
                 * @returns {Object} an A+ Promise object, that will provide an array of discovered capabilities, callback signatures:
                 *          then({Array[CapabilityInformation]} discoveredCaps).catch({Error} error)
                 */
                this.lookup =
                        function lookup(domain, interfaceName, discoveryQos) {
                            var localCapabilities, globalCapabilities;

                            switch (discoveryQos.discoveryScope) {

                                // only interested in local results
                                case DiscoveryScope.LOCAL_ONLY:
                                    return Promise.resolve(localCapabilitiesStore.lookup({
                                        domain : domain,
                                        interfaceName : interfaceName
                                    }));

                                    // if anything local use it. Otherwise lookup global.
                                case DiscoveryScope.LOCAL_THEN_GLOBAL:
                                    localCapabilities = localCapabilitiesStore.lookup({
                                        domain : domain,
                                        interfaceName : interfaceName
                                    });
                                    if (localCapabilities.length > 0) {
                                        return Promise.resolve(localCapabilities);
                                    }
                                    globalCapabilities = globalCapabilitiesCache.lookup({
                                        domain : domain,
                                        interfaceName : interfaceName,
                                        cacheMaxAge : discoveryQos.cacheMaxAge
                                    });
                                    if (globalCapabilities.length > 0) {
                                        return Promise.resolve(globalCapabilities);
                                    }
                                    return lookupGlobalCapabilities(
                                            domain,
                                            interfaceName,
                                            TTL_30DAYS_IN_MS,
                                            localCapabilities);

                                    // Use local results, but then lookup global
                                case DiscoveryScope.LOCAL_AND_GLOBAL:
                                    localCapabilities = localCapabilitiesStore.lookup({
                                        domain : domain,
                                        interfaceName : interfaceName
                                    });
                                    globalCapabilities = globalCapabilitiesCache.lookup({
                                        domain : domain,
                                        interfaceName : interfaceName,
                                        cacheMaxAge : discoveryQos.cacheMaxAge
                                    });
                                    if (globalCapabilities.length === 0) {
                                        return lookupGlobalCapabilities(
                                                domain,
                                                interfaceName,
                                                TTL_30DAYS_IN_MS,
                                                localCapabilities);
                                    }
                                    return Promise.resolve(localCapabilities
                                            .concat(globalCapabilities));

                                case DiscoveryScope.GLOBAL_ONLY:
                                    globalCapabilities = globalCapabilitiesCache.lookup({
                                        domain : domain,
                                        interfaceName : interfaceName,
                                        cacheMaxAge : discoveryQos.cacheMaxAge
                                    });
                                    if (globalCapabilities.length > 0) {
                                        return Promise.resolve(globalCapabilities);
                                    }
                                    return lookupGlobalCapabilities(
                                            domain,
                                            interfaceName,
                                            TTL_30DAYS_IN_MS,
                                            globalCapabilities);
                            }
                        };

                /**
                 * This method adds a capability in the local and/or global capabilities directory according to the given registration
                 * strategy.
                 *
                 * @function
                 * @name CapabilityDiscovery#add
                 *
                 * @param {String}
                 *            domain of the capability
                 * @param {String}
                 *            interfaceName of the capability
                 * @param {String}
                 *            participantId of the capability
                 * @param {ProviderQos}
                 *            providerQos of the capability
                 * @param {Array}
                 *            array of communication middlewares
                 *
                 * @returns {Object} an A+ promise
                 */
                this.add =
                        function add(discoveryEntry) {
                            localCapabilitiesStore.add({
                                discoveryEntry : discoveryEntry,
                                remote : false
                            });
                            var promise;
                            if (discoveryEntry.qos.scope === ProviderScope.LOCAL) {
                                promise= Promise.resolve();
                            } else if (discoveryEntry.qos.scope === ProviderScope.GLOBAL) {
                                promise = getGlobalCapabilitiesDirectoryProxy(TTL_30DAYS_IN_MS).then(function(globalCapabilitiesDirectoryProxy){
                                    return globalCapabilitiesDirectoryProxy.add({
                                        capability : toCapabilityInformation(discoveryEntry)
                                    }).catch(function(error) {
                                        throw new Error("Error calling operation \"add\" of GlobalCapabilitiesDirectory because: "
                                                + error);
                                    });
                                });
                            } else {
                                promise = Promise.reject(new Error("Encountered unknown ProviderQos scope \""
                                        + discoveryEntry.qos.scope + "\""));
                            }
                            return promise;
                        };

                /**
                 * This method removes a capability from the global capabilities directory.
                 *
                 * @function
                 * @name CapabilityDiscovery#removeParticipantIdFromGlobalCapabilitiesDirectory
                 *
                 * @param {String}
                 *            participantId to remove
                 *
                 * @returns {Object} an A+ promise
                 */
                function removeParticipantIdFromGlobalCapabilitiesDirectory(participantId) {
                    return getGlobalCapabilitiesDirectoryProxy(TTL_30DAYS_IN_MS).then(function(globalCapabilitiesDirectoryProxy){
                        return globalCapabilitiesDirectoryProxy.remove({
                            participantId : participantId
                        }).catch(function(error) {
                            throw new Error("Error calling operation \"remove\" of GlobalCapabilitiesDirectory because: "
                                    + error);
                        });
                    });
                }

                /**
                 * This method removes a capability from the local and/or global capabilities directory according to the given registration
                 * strategy.
                 *
                 * @function
                 * @name CapabilityDiscovery#remove
                 *
                 * @param {String}
                 *            participantId to remove
                 *
                 * @returns {Object} an A+ promise
                 */
                this.remove =
                        function remove(participantId) {
                            var discoveryEntries = localCapabilitiesStore.lookup({
                                participantId : participantId
                            });
                            var promise;

                            localCapabilitiesStore.remove({
                                participantId : participantId
                            });
                            if (discoveryEntries === undefined
                                    || discoveryEntries.length !== 1) {
                                log
                                .warn("remove(): no capability entry found in local capabilities store for participantId "
                                        + participantId
                                        + ". Trying to remove the capability from global directory");
                                promise = removeParticipantIdFromGlobalCapabilitiesDirectory(
                                        participantId);
                            } else {
                                if (discoveryEntries[0].qos.scope === ProviderScope.LOCAL
                                        || discoveryEntries.length < 1) {
                                    promise = Promise.resolve();
                                } else if (discoveryEntries[0].qos.scope === ProviderScope.GLOBAL) {
                                    promise = removeParticipantIdFromGlobalCapabilitiesDirectory(
                                            participantId);
                                } else {
                                    promise = Promise.reject(new Error(
                                            "Encountered unknown ProviderQos scope \""
                                            + discoveryEntries[0].qos.scope
                                            + "\""));
                                }
                            }
                            return promise;
                        };
            }

            return CapabilityDiscovery;

        });
