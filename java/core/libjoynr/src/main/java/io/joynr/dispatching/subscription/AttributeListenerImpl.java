package io.joynr.dispatching.subscription;

import io.joynr.pubsub.publication.AttributeListener;

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

public class AttributeListenerImpl implements AttributeListener {

    private final String subscriptionId;
    private final PublicationManagerImpl publicationManagerImpl;

    public AttributeListenerImpl(String subscriptionId, PublicationManagerImpl publicationManagerImpl) {
        this.subscriptionId = subscriptionId;
        this.publicationManagerImpl = publicationManagerImpl;

    }

    @Override
    public void attributeValueChanged(Object value) {
        publicationManagerImpl.attributeValueChanged(subscriptionId, value);

    }

}
