/*jslint es5: true */

/*
 * #%L
 * %%
 * Copyright (C) 2011 - 2016 BMW Car IT GmbH
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

define([
    "global/Promise",
    "joynr/system/RoutingTypes/ChannelAddress",
    "joynr/messaging/channel/ChannelMessagingStub",
    "joynr/messaging/MessageReplyToAddressCalculator"
], function(Promise, ChannelAddress, ChannelMessagingStub, MessageReplyToAddressCalculator) {

    describe("libjoynr-js.joynr.messaging.channel.ChannelMessagingStub", function() {
        var channelMessagingSender, destinationChannelAddress, myChannelAddress;
        var channelMessagingStub1, channelMessagingStub2, joynrMessage;
        var messageReplyToAddressCalculator;
        var url = "http://testurl";

        beforeEach(function(done) {
            channelMessagingSender = jasmine.createSpyObj("channelMessagingSender", [ "send"
            ]);
            channelMessagingSender.send.and.returnValue(Promise.resolve());
            destinationChannelAddress = new ChannelAddress({
                channelId : "destChannelId",
                messagingEndpointUrl : url
            });
            myChannelAddress = new ChannelAddress({
                channelId : "myChannelId",
                messagingEndpointUrl : url
            });

            messageReplyToAddressCalculator = new MessageReplyToAddressCalculator({
                replyToAddress : myChannelAddress
            });

            channelMessagingStub1 = new ChannelMessagingStub({
                destinationChannelAddress : destinationChannelAddress,
                myChannelAddress : myChannelAddress,
                channelMessagingSender : channelMessagingSender,
                messageReplyToAddressCalculator : messageReplyToAddressCalculator
            });
            channelMessagingStub2 = new ChannelMessagingStub({
                destinationChannelAddress : destinationChannelAddress,
                myChannelAddress : destinationChannelAddress,
                channelMessagingSender : channelMessagingSender,
                messageReplyToAddressCalculator : messageReplyToAddressCalculator
            });
            joynrMessage = {
                key : "joynrMessage",
                type : "request"
            };
            done();
        });

        it("is instantiable and of correct type", function(done) {
            expect(ChannelMessagingStub).toBeDefined();
            expect(typeof ChannelMessagingStub === "function").toBeTruthy();
            expect(channelMessagingStub1).toBeDefined();
            expect(channelMessagingStub1 instanceof ChannelMessagingStub).toBeTruthy();
            expect(channelMessagingStub1.transmit).toBeDefined();
            expect(typeof channelMessagingStub1.transmit === "function").toBeTruthy();
            done();
        });

        it("drop outgoing message if destChannel = myChannel", function(done) {
            channelMessagingStub2.transmit(joynrMessage).catch(function() { return null; });
            expect(channelMessagingSender.send).not.toHaveBeenCalled();
            expect(joynrMessage.replyChannelId).toBeUndefined();
            done();
        });

        it("transmits a message and set replyChannelId", function(done) {
            expect(joynrMessage.replyChannelId).toBeUndefined();
            channelMessagingStub1.transmit(joynrMessage);
            expect(channelMessagingSender.send).toHaveBeenCalledWith(
                    joynrMessage,
                    destinationChannelAddress);
            expect(joynrMessage.replyChannelId).toBe(JSON.stringify(myChannelAddress));
            done();
        });

    });

});
