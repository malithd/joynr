/*
 * #%L
 * %%
 * Copyright (C) 2011 - 2014 BMW Car IT GmbH
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
#include "joynr/WebSocketCcMessagingSkeleton.h"

#include <QtWebSockets/QWebSocketServer>
#include <QtWebSockets/QWebSocket>

#include "joynr/JsonSerializer.h"
#include "joynr/system/RoutingTypes/QtWebSocketClientAddress.h"

namespace joynr
{

joynr_logging::Logger* WebSocketCcMessagingSkeleton::logger =
        joynr_logging::Logging::getInstance()->getLogger("MSG", "WebSocketCcMessagingSkeleton");

WebSocketCcMessagingSkeleton::WebSocketCcMessagingSkeleton(
        MessageRouter& messageRouter,
        WebSocketMessagingStubFactory& messagingStubFactory,
        const system::RoutingTypes::QtWebSocketAddress& serverAddress)
        : webSocketServer(Q_NULLPTR),
          clients(),
          messageRouter(messageRouter),
          messagingStubFactory(messagingStubFactory)
{
    // must register metatype in order to deserialize initialization message from client
    qRegisterMetaType<joynr::system::RoutingTypes::QtWebSocketClientAddress>(
            "joynr::system::RoutingTypes::QtWebSocketClientAddress");

    QWebSocketServer::SslMode sslMode(QWebSocketServer::NonSecureMode);
    if (serverAddress.getProtocol() == joynr::system::RoutingTypes::QtWebSocketProtocol::WSS) {
        sslMode = QWebSocketServer::SecureMode;
    }

    webSocketServer = new QWebSocketServer(QStringLiteral("joynr CC"), sslMode, this);

    if (webSocketServer->listen(QHostAddress::Any, serverAddress.getPort())) {
        LOG_INFO(logger,
                 QString("joynr CC WebSocket server listening on port %0.")
                         .arg(serverAddress.getPort()));
        connect(webSocketServer,
                &QWebSocketServer::newConnection,
                this,
                &WebSocketCcMessagingSkeleton::onNewConnection);
    } else {
        LOG_FATAL(logger,
                  QString("Error: WebSocket server could not listen on port %0.")
                          .arg(serverAddress.getPort()));
    }
}

WebSocketCcMessagingSkeleton::~WebSocketCcMessagingSkeleton()
{
    webSocketServer->close();
    webSocketServer->deleteLater();
    qDeleteAll(clients.begin(), clients.end());
}

void WebSocketCcMessagingSkeleton::transmit(JoynrMessage& message)
{
    messageRouter.route(message);
}

void WebSocketCcMessagingSkeleton::onNewConnection()
{
    QWebSocket* client = webSocketServer->nextPendingConnection();

    connect(client,
            &QWebSocket::textMessageReceived,
            this,
            &WebSocketCcMessagingSkeleton::onTextMessageReceived);
    connect(client,
            &QWebSocket::disconnected,
            this,
            &WebSocketCcMessagingSkeleton::onSocketDisconnected);

    clients.append(client);
}

void WebSocketCcMessagingSkeleton::onTextMessageReceived(const QString& message)
{
    QWebSocket* client = qobject_cast<QWebSocket*>(sender());

    if (isInitializationMessage(message)) {
        LOG_DEBUG(
                logger,
                QString("received initialization message from websocket client: %0").arg(message));
        // register client with messaging stub factory
        joynr::system::RoutingTypes::QtWebSocketClientAddress* clientAddress =
                JsonSerializer::deserialize<joynr::system::RoutingTypes::QtWebSocketClientAddress>(
                        message.toUtf8());
        // client address must be valid, or libjoynr and CC are deployed in different versions
        assert(clientAddress);
        messagingStubFactory.addClient(*clientAddress, client);
        delete clientAddress;

        // cleanup
        disconnect(client,
                   &QWebSocket::disconnected,
                   this,
                   &WebSocketCcMessagingSkeleton::onSocketDisconnected);
        clients.removeAll(client);
        return;
    }

    // deserialize message and transmit
    joynr::JoynrMessage* joynrMsg =
            JsonSerializer::deserialize<joynr::JoynrMessage>(message.toUtf8());
    if (joynrMsg == Q_NULLPTR) {
        LOG_ERROR(logger,
                  QString("Unable to deserialize joynr message object from: %1").arg(message));
        return;
    }
    LOG_TRACE(logger, QString("INCOMING\nmessage: %0").arg(message));
    // message router copies joynr message when scheduling thread that handles
    // message delivery
    transmit(*joynrMsg);
    delete joynrMsg;
}

void WebSocketCcMessagingSkeleton::onSocketDisconnected()
{
    QWebSocket* client = qobject_cast<QWebSocket*>(sender());
    if (clients.contains(client)) {
        clients.removeAll(client);
        client->deleteLater();
    }
}

void WebSocketCcMessagingSkeleton::onAcceptError(QAbstractSocket::SocketError socketError)
{
    QString code;
    QDebug(&code) << socketError;
    LOG_ERROR(logger, QString("Unable to accept new socket connection. Error: %0.").arg(code));
}

void WebSocketCcMessagingSkeleton::onServerError(QWebSocketProtocol::CloseCode closeCode)
{
    QString code;
    QDebug(&code) << closeCode;
    LOG_ERROR(logger,
              QString("Error occured on WebSocket connection: %0. Description: %1.").arg(code).arg(
                      webSocketServer->errorString()));
}

bool WebSocketCcMessagingSkeleton::isInitializationMessage(const QString& message)
{
    return message.startsWith("{\"_typeName\":\"joynr.system.WebSocketClientAddress\"");
}

} // namespace joynr
