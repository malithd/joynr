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
#ifndef MESSAGINGSTUBFACTORY_H
#define MESSAGINGSTUBFACTORY_H
#include "joynr/PrivateCopyAssign.h"

#include "joynr/RuntimeConfig.h"
#include "joynr/Directory.h"
#include "joynr/IMessagingStubFactory.h"
#include "joynr/IMiddlewareMessagingStubFactory.h"
#include "joynr/system/RoutingTypes/QtAddress.h"
#include <string>
#include <memory>

namespace joynr
{

class IMessaging;

class InProcessMessagingSkeleton;

/**
  * Creates/Stores <Middleware>MessagingStubs. MessagingStubs are used to contact remote
  *ClusterControllers (HttpCommunicationManager)
  * and libjoynrs (dummy<Libjoynr>Skeleton) on the machine.
  * A libjoynr does not need a MessagingStubFactory, as each libJoynr has one MessagingStub that
  *connects it to its cc,
  * and will nevere use any other MessagingStubs.
  *
  */

class MessagingStubFactory : public IMessagingStubFactory
{

public:
    virtual ~MessagingStubFactory();
    // MessagingStubFactory is created without the necessary skeletons.
    // Those Skeletons must be registered before the MessagingStubFactory is used.
    MessagingStubFactory();

    // void registerInProcessMessagingSkeleton(QSharedPointer<InProcessMessagingSkeleton>
    // messagingSkeleton);

    std::shared_ptr<IMessaging> create(
            const joynr::system::RoutingTypes::QtAddress& destinationAddress);
    void remove(const joynr::system::RoutingTypes::QtAddress& destinationAddress);
    bool contains(const joynr::system::RoutingTypes::QtAddress& destinationAddress);

    void registerStubFactory(IMiddlewareMessagingStubFactory* factory);

private:
    DISALLOW_COPY_AND_ASSIGN(MessagingStubFactory);

    Directory<joynr::system::RoutingTypes::QtAddress, IMessaging> address2MessagingStubDirectory;
    QList<IMiddlewareMessagingStubFactory*> factoryList;
    QMutex mutex;
};

} // namespace joynr
#endif // MESSAGINGSTUBFACTORY
