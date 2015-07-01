package io.joynr.generator.cpp.provider
/*
 * !!!
 *
 * Copyright (C) 2011 - 2015 BMW Car IT GmbH
 *
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
 */

import com.google.inject.Inject
import org.franca.core.franca.FInterface
import org.franca.core.franca.FType
import io.joynr.generator.cpp.util.TemplateBase
import io.joynr.generator.cpp.util.JoynrCppGeneratorExtensions
import io.joynr.generator.util.InterfaceTemplate

class InterfaceRequestInterpreterCppTemplate implements InterfaceTemplate{

	@Inject
	private extension TemplateBase

	@Inject
	private extension JoynrCppGeneratorExtensions

	override generate(FInterface serviceInterface)
'''
«val interfaceName = serviceInterface.joynrName»
«warning()»
#include <functional>

#include "«getPackagePathWithJoynrPrefix(serviceInterface, "/")»/«interfaceName»RequestInterpreter.h"

#include "joynr/Request.h"
#include "«getPackagePathWithJoynrPrefix(serviceInterface, "/")»/«interfaceName»RequestCaller.h"
#include "joynr/DeclareMetatypeUtil.h"
#include "joynr/Util.h"
#include "joynr/RequestStatus.h"
#include <cassert>

«FOR parameterType: getRequiredIncludesFor(serviceInterface)»
	#include "«parameterType»"
«ENDFOR»

«getNamespaceStarter(serviceInterface)»

joynr::joynr_logging::Logger* «interfaceName»RequestInterpreter::logger = joynr::joynr_logging::Logging::getInstance()->getLogger("SDMO", "«interfaceName»RequestInterpreter");

«interfaceName»RequestInterpreter::«interfaceName»RequestInterpreter()
{
	«FOR datatype: getAllComplexAndEnumTypes(serviceInterface)»
		«IF datatype instanceof FType»
			qRegisterMetaType<«getMappedDatatype(datatype)»>("«getMappedDatatype(datatype)»");
		«ENDIF»
	«ENDFOR»
}

void «interfaceName»RequestInterpreter::execute(
		QSharedPointer<joynr::RequestCaller> requestCaller,
		const QString& methodName,
		const QList<QVariant>& paramValues,
		const QList<QVariant>& paramTypes,
		std::function<void (const QVariant&)> callbackFct)
{
	«val requestCallerName = interfaceName.toFirstLower+"RequestCallerVar"»
	Q_UNUSED(paramValues);//if all methods of the interface are empty, the paramValues would not be used and give a warning.
	Q_UNUSED(paramTypes);//if all methods of the interface are empty, the paramTypes would not be used and give a warning.
	// cast generic RequestCaller to «interfaceName»Requestcaller
	QSharedPointer<«interfaceName»RequestCaller> «requestCallerName» =
			requestCaller.dynamicCast<«interfaceName»RequestCaller>();

	«val attributes = getAttributes(serviceInterface)»
	«val methods = getMethods(serviceInterface)»

	// execute operation
	// TODO need to put the status code into the reply
	«IF attributes.size>0»
		joynr::RequestStatus status;
		«FOR attribute: attributes SEPARATOR "\n} else"»
			«val attributeName = attribute.joynrName»
			«val returnType = getMappedDatatypeOrList(attribute)»
			if (methodName == "get«attributeName.toFirstUpper»"){
				std::function<void(const joynr::RequestStatus& status, «returnType» «attributeName»)> requestCallerCallbackFct =
						[callbackFct](const joynr::RequestStatus& status, «returnType» «attributeName»){
							Q_UNUSED(status);
							QVariant returnValue(«IF isArray(attribute)»joynr::Util::convertListToVariantList<«getMappedDatatype(attribute)»>(«attributeName»)«ELSE»QVariant::fromValue(«attributeName»)«ENDIF»);
							callbackFct(returnValue);
						};
				«requestCallerName»->get«attributeName.toFirstUpper»(requestCallerCallbackFct);
			} else if (methodName == "set«attributeName.toFirstUpper»" && paramTypes.size() == 1){
				QVariant «attributeName»QVar(paramValues.at(0));
				«IF isEnum(attribute.type)»
					«getMappedDatatypeOrList(attribute)» typedInput«attributeName.toFirstUpper» = «joynrGenerationPrefix»::Util::convertVariantToEnum<«getEnumContainer(attribute.type)»>(«attributeName»QVar);
				«ELSEIF isEnum(attribute.type) && isArray(attribute)»
					«getMappedDatatypeOrList(attribute)» typedInput«attributeName.toFirstUpper» =
						«joynrGenerationPrefix»::Util::convertVariantListToEnumList<«getEnumContainer(attribute.type)»>(«attributeName»QVar.toList());
				«ELSEIF isArray(attribute)»
					assert(«attributeName»QVar.canConvert<QList<QVariant> >());
					QList<QVariant> paramQList = «attributeName»QVar.value<QList<QVariant> >();
					«getMappedDatatypeOrList(attribute)» typedInput«attributeName.toFirstUpper» = «joynrGenerationPrefix»::Util::convertVariantListToList<«getMappedDatatype(attribute)»>(paramQList);
				«ELSE»
					assert(«attributeName»QVar.canConvert<«getMappedDatatypeOrList(attribute)»>());
					«getMappedDatatypeOrList(attribute)» typedInput«attributeName.toFirstUpper» = «attributeName»QVar.value<«getMappedDatatypeOrList(attribute)»>();
				«ENDIF»
				std::function<void(const joynr::RequestStatus& status)> requestCallerCallbackFct =
						[callbackFct](const joynr::RequestStatus& status){
							Q_UNUSED(status);
							QVariant returnValue("void");
							callbackFct(returnValue);
						};
				«requestCallerName»->set«attributeName.toFirstUpper»(typedInput«attributeName.toFirstUpper», requestCallerCallbackFct);

		«ENDFOR»
		} else «IF methods.empty»{«ENDIF»
	«ENDIF»
	«IF methods.size>0»
		«FOR method: getMethods(serviceInterface) SEPARATOR "\n} else"»
			«val inputUntypedParamList = method.getCommaSeperatedUntypedParameterList»
			«val methodName = method.joynrName»
			«val inputParams = getInputParameters(method)»
			«var iterator = -1»
			if(methodName == "«methodName»" && paramTypes.size() == «inputParams.size»
				«FOR input : inputParams»
					&& paramTypes.at(«iterator=iterator+1») == "«getJoynrTypeName(input)»"
				«ENDFOR»
			) {
				«val outputTypedParamList = prependCommaIfNotEmpty(if (method.outputParameters.empty) "" else ("const " + method.outputParameters.head.mappedDatatypeOrList + "& " + method.outputParameters.head.joynrName))»
				std::function<void(const joynr::RequestStatus& status«outputTypedParamList»)> requestCallerCallbackFct =
						[callbackFct](const joynr::RequestStatus& status«outputTypedParamList»){
							Q_UNUSED(status);
							«IF method.outputParameters.empty»
								QVariant returnValue(QVariant::Invalid);
							«ELSE»
								QVariant returnValue(«IF isArray(method.outputParameters.head)»joynr::Util::convertListToVariantList<«method.outputParameters.head.mappedDatatype»>(«method.outputParameters.head.joynrName»)«ELSE»QVariant::fromValue(«method.outputParameters.head.joynrName»)«ENDIF»);
							«ENDIF»
							callbackFct(returnValue);
						};

				«var iterator2 = -1»
				«FOR input : inputParams»
					«val inputName = input.joynrName»
					QVariant «inputName»QVar(paramValues.at(«iterator2=iterator2+1»));
					«IF isEnum(input.type) && isArray(input)»
						//isEnumArray
						«getMappedDatatypeOrList(input)» «inputName» =
							«joynrGenerationPrefix»::Util::convertVariantListToEnumList<«getEnumContainer(input.type)»> («inputName»QVar.toList());
					«ELSEIF isEnum(input.type)»
						//isEnum
						«getMappedDatatypeOrList(input)» «inputName» = «joynrGenerationPrefix»::Util::convertVariantToEnum<«getEnumContainer(input.type)»>(«inputName»QVar);
					«ELSEIF isArray(input)»
						//isArray
						assert(«inputName»QVar.canConvert<QList<QVariant> >());
						QList<QVariant> «inputName»QVarList = «inputName»QVar.value<QList<QVariant> >();
						QList<«getMappedDatatype(input)»> «inputName» = «joynrGenerationPrefix»::Util::convertVariantListToList<«getMappedDatatype(input)»>(«inputName»QVarList);
					«ELSE»
						//«getMappedDatatypeOrList(input)»
						assert(«inputName»QVar.canConvert<«getMappedDatatypeOrList(input)»>());
						«getMappedDatatypeOrList(input)» «inputName» = «inputName»QVar.value<«getMappedDatatypeOrList(input)»>();
					«ENDIF»
				«ENDFOR»

				«requestCallerName»->«methodName»(
						«IF !method.inputParameters.empty»«inputUntypedParamList»,«ENDIF»
						requestCallerCallbackFct);
		«ENDFOR»
		} else {
	«ENDIF»
		LOG_FATAL(logger, "unknown method name for interface «interfaceName»: " + methodName);
		assert(false);
		QVariant returnValue(QVariant::Invalid);
		callbackFct(returnValue);
	}
}

«getNamespaceEnder(serviceInterface)»
'''
}
