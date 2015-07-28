/*
 * #%L
 * %%
 * Copyright (C) 2011 - 2013 BMW Car IT GmbH
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
#include "joynr/PrivateCopyAssign.h"
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "PrettyPrint.h"
#include "joynr/tests/testProxy.h"
#include "joynr/types/GpsLocation.h"
#include "joynr/ConnectorFactory.h"
#include "joynr/IClientCache.h"
#include "joynr/IMessaging.h"
#include "joynr/vehicle/GpsJoynrMessagingConnector.h"
#include "joynr/IJoynrMessageSender.h"
#include "joynr/InProcessConnectorFactory.h"
#include "joynr/Dispatcher.h"
#include "joynr/SubscriptionReply.h"
#include "joynr/SubscriptionStop.h"
#include "joynr/SubscriptionPublication.h"
#include "joynr/ReplyCaller.h"
#include "joynr/IReplyCaller.h"
#include "joynr/Dispatcher.h"
#include "tests/utils/MockObjects.h"
#include <QVariant>
#include <string>

using ::testing::A;
using ::testing::_;
using ::testing::Return;
using ::testing::Eq;
using ::testing::NotNull;
using ::testing::AllOf;
using ::testing::Property;
using ::testing::Invoke;
using ::testing::Unused;
using namespace joynr;

/**
 * These tests test the communication from X through to the JoynrMessageSender.
 * Some methods are defined here, that are used in ProxyTest and GpsJoynrMessagingConnectorTest
 */

class CallBackActions {
public:
    CallBackActions(joynr::types::GpsLocation expectedGpsLocation, int expectedInt) :
        expectedGpsLocation(expectedGpsLocation),
        expectedInt(expectedInt)
    {
    }
    // for test: sync_setAttributeNotCached
    void executeCallBackVoidResult(
            Unused, // sender participant ID
            Unused, // receiver participant ID
            Unused, // messaging QoS
            Unused, // request object to send
            QSharedPointer<IReplyCaller> callback // reply caller to notify when reply is received
    ) {
        (callback.dynamicCast<ReplyCaller<void> >())->returnValue();
    }

    // related to test: sync_getAttributeNotCached
    void executeCallBackGpsLocationResult(
            Unused, // sender participant ID
            Unused, // receiver participant ID
            Unused, // messaging QoS
            Unused, // request object to send
            QSharedPointer<IReplyCaller> callback // reply caller to notify when reply is received
    ) {
       (callback.dynamicCast<ReplyCaller<types::GpsLocation> >())->returnValue(expectedGpsLocation);
    }

    // related to test: sync_OperationWithNoArguments
    void executeCallBackIntResult(
            Unused, // sender participant ID
            Unused, // receiver participant ID
            Unused, // messaging QoS
            Unused, // request object to send
            QSharedPointer<IReplyCaller> callback // reply caller to notify when reply is received
    ) {

        callback.dynamicCast<ReplyCaller<int> >()->returnValue(expectedInt);
    }
private:
    joynr::types::GpsLocation expectedGpsLocation;
    int expectedInt;
};


/**
 * @brief Fixutre.
 */
class AbstractSyncAsyncTest : public ::testing::Test {
public:
    AbstractSyncAsyncTest():
        expectedGpsLocation(1.1, 1.2, 1.3, types::Localisation::StdGpsFixEnum::MODE3D, 1.4, 1.5, 1.6, 1.7, 18, 19, 95302963),
        expectedInt(60284917),
        callBackActions(types::GpsLocation::createQt(expectedGpsLocation), expectedInt),
        qosSettings(),
        mockDispatcher(),
        mockMessagingStub(),
        callBack(),
        mockJoynrMessageSender(),
        proxyParticipantId(),
        providerParticipantId(),
        mockClientCache(),
        endPointAddress(),
        asyncTestFixture(NULL)
    {}
    virtual ~AbstractSyncAsyncTest(){}
    void SetUp(){
        qosSettings = MessagingQos(456000);
        endPointAddress = QSharedPointer<system::Address>(new system::ChannelAddress("endPointAddress"));
        proxyParticipantId = "participantId";
        providerParticipantId = "providerParticipantId";
        mockJoynrMessageSender = new MockJoynrMessageSender();
        // asyncGpsFixture must be created after derived objects have run Setup()
    }

    void TearDown(){
        delete mockJoynrMessageSender;
        delete asyncTestFixture;
    }



    // sets the expectations on the call expected on the MessageSender from the connector
    virtual testing::internal::TypedExpectation<void(
            const std::string&,
            const std::string&,
            const MessagingQos&,
            const Request&,
            QSharedPointer<IReplyCaller>
    )>& setExpectationsForSendRequestCall(int expectedTypeId, std::string methodName) = 0;

    virtual tests::Itest* createFixture(bool cacheEnabled)=0;

    void testAsync_getAttributeNotCached() {
        asyncTestFixture = createFixture(false);

        MockCallback<joynr::types::Localisation::StdGpsLocation>* callback = new MockCallback<joynr::types::Localisation::StdGpsLocation>();

        setExpectationsForSendRequestCall(Util::getTypeId<joynr::types::GpsLocation>(), "getLocation");
        asyncTestFixture->getLocation(
                [callback] (const joynr::RequestStatus& status, const joynr::types::Localisation::StdGpsLocation& location) {
                    callback->callbackFct(status, location);
                });
    }

    void testSync_setAttributeNotCached() {
        tests::Itest* testFixture = createFixture(false);

        EXPECT_CALL(
                    *mockJoynrMessageSender,
                    sendRequest(
                        _, //Eq(proxyParticipantId), // sender participant ID
                        Eq(providerParticipantId), // receiver participant ID
                        _, // messaging QoS
                        AllOf(
                            Property(&Request::getMethodName, Eq("setLocation")),
                            Property(&Request::getParams, (Property(&QList<QVariant>::size, Eq(1))))
                        ), // request object to send
                        Property(
                            &QSharedPointer<IReplyCaller>::data,
                            AllOf(NotNull(), Property(&IReplyCaller::getTypeId, Eq(Util::getTypeId<void>())))
                        ) // reply caller to notify when reply is received
                    )
        ).WillOnce(Invoke(&callBackActions, &CallBackActions::executeCallBackVoidResult));

        RequestStatus status;
        testFixture->setLocation(status, expectedGpsLocation);
        delete testFixture;
    }


    void testSync_getAttributeNotCached() {
        tests::Itest* testFixture = createFixture(false);
        setExpectationsForSendRequestCall(Util::getTypeId<joynr::types::GpsLocation>(), "getLocation")
                .WillOnce(Invoke(&callBackActions, &CallBackActions::executeCallBackGpsLocationResult));

        RequestStatus status;
        types::Localisation::StdGpsLocation gpsLocation;
        testFixture->getLocation(status, gpsLocation);
        EXPECT_EQ(expectedGpsLocation, gpsLocation);
        EXPECT_TRUE(status.successful());
        delete testFixture;
    }

    void testAsync_getAttributeCached() {
        asyncTestFixture = createFixture(true);

        MockCallback<joynr::types::Localisation::StdGpsLocation>* callback = new MockCallback<joynr::types::Localisation::StdGpsLocation>();

        setExpectationsForSendRequestCall(Util::getTypeId<joynr::types::GpsLocation>(), "getLocation").Times(0);

        QVariant qvariant;
        qvariant.setValue(types::GpsLocation::createQt(expectedGpsLocation));

        ON_CALL(mockClientCache, lookUp(_)).WillByDefault(Return(qvariant));

        asyncTestFixture->getLocation(
                [callback] (const RequestStatus& status, const types::Localisation::StdGpsLocation& location) {
                    callback->callbackFct(status, location);
                });
    }

    void testSync_getAttributeCached() {
        tests::Itest* testFixture = createFixture(true);

        setExpectationsForSendRequestCall(Util::getTypeId<joynr::types::GpsLocation>(), "getLocation").Times(0);

        QVariant qvariant;
        qvariant.setValue(types::GpsLocation::createQt(expectedGpsLocation));
        ON_CALL(mockClientCache, lookUp(_)).WillByDefault(Return(qvariant));

        RequestStatus status;
        types::Localisation::StdGpsLocation gpsLocation;
        testFixture->getLocation(status, gpsLocation);
        EXPECT_EQ(expectedGpsLocation, gpsLocation);
        EXPECT_TRUE(status.successful());
        delete testFixture;
    }

    void testAsync_OperationWithNoArguments() {
        asyncTestFixture = createFixture(false);

        MockCallback<int>* callback = new MockCallback<int>();

        setExpectationsForSendRequestCall(Util::getTypeId<int>(), "methodWithNoInputParameters");

        asyncTestFixture->methodWithNoInputParameters(
                [callback] (const RequestStatus& status, const int& value) {
                    callback->callbackFct(status, value);
                });
    }

    void testSync_OperationWithNoArguments() {
        tests::Itest* testFixture = createFixture(false);
        setExpectationsForSendRequestCall(Util::getTypeId<int>(), "methodWithNoInputParameters")
                .WillOnce(Invoke(&callBackActions, &CallBackActions::executeCallBackIntResult));

        RequestStatus requestStatus;
        int result;
        testFixture->methodWithNoInputParameters(requestStatus, result);
        EXPECT_EQ(expectedInt, result);
        EXPECT_TRUE(requestStatus.successful());
        delete testFixture;
    }

    void testSubscribeToAttribute() {
        //EXPECT_CALL(*mockJoynrMessageSender,
        //            sendSubscriptionRequest(_,_,_,_)).Times(1);

        std::shared_ptr<ISubscriptionListener<types::Localisation::StdGpsLocation> > subscriptionListener(
                    new MockGpsSubscriptionListener());
        //TODO uncomment once the connector has the correct signature!
        //vehicle::IGps* gpsFixture = createFixture(false);
        //SubscriptionQos  subscriptionQos(100, 200, true, 80, 80);
        //gpsFixture->subscribeToLocation(subscriptionListener, subscriptionQos);
        //delete gpsFixture;
    }

protected:
    joynr::types::Localisation::StdGpsLocation expectedGpsLocation;
    int expectedInt;
    CallBackActions callBackActions;
    MessagingQos qosSettings;
    MockDispatcher mockDispatcher;
    MockMessaging mockMessagingStub;
    QSharedPointer<IReplyCaller> callBack;
    MockJoynrMessageSender* mockJoynrMessageSender;
    std::string proxyParticipantId;
    std::string providerParticipantId;
    MockClientCache mockClientCache;
    QSharedPointer<system::Address> endPointAddress;
    tests::Itest* asyncTestFixture;
private:
    DISALLOW_COPY_AND_ASSIGN(AbstractSyncAsyncTest);
};
