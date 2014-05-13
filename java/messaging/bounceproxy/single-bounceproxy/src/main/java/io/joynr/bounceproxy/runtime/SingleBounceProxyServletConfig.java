package io.joynr.bounceproxy.runtime;

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

import io.joynr.bounceproxy.service.ChannelService;
import io.joynr.bounceproxy.service.TimeService;
import io.joynr.guice.servlet.AbstractGuiceServletConfig;
import io.joynr.guice.servlet.AbstractJoynrServletModule;
import io.joynr.messaging.bounceproxy.AtmosphereModule;
import io.joynr.messaging.bounceproxy.filter.CharacterEncodingFilter;
import io.joynr.messaging.bounceproxy.filter.CorsFilter;

import java.util.LinkedList;
import java.util.List;

import org.atmosphere.guice.GuiceManagedAtmosphereServlet;

import com.google.inject.Module;

/**
 * Servlet configuration for single bounceproxy servlet.
 * 
 * @author christina.strobel
 * 
 */
public class SingleBounceProxyServletConfig extends AbstractGuiceServletConfig {

    private final List<Module> modules;

    private final AtmosphereModule atmosphereModule;

    public SingleBounceProxyServletConfig() {

        atmosphereModule = new AtmosphereModule();

        modules = new LinkedList<Module>();
        modules.add(atmosphereModule);
    }

    @Override
    protected AbstractJoynrServletModule getJoynrServletModule() {
        return new AbstractJoynrServletModule() {

            @Override
            protected void configureJoynrServlets() {

                bind(ChannelService.class);
                bind(TimeService.class);

                filter("/*").through(CharacterEncodingFilter.class);
                filter("/*").through(CorsFilter.class);
            }

            @Override
            protected void bindJoynrServletClass() {
                serve("/*").with(GuiceManagedAtmosphereServlet.class, atmosphereModule.getParameters());
            }

        };
    }

    @Override
    protected List<Module> getJoynrModules() {
        return modules;
    }

}
