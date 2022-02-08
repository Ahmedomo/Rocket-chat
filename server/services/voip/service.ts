import { Db } from 'mongodb';

import { IVoipService } from '../../sdk/types/IVoipService';
import { ServiceClass } from '../../sdk/types/ServiceClass';
import { Logger } from '../../lib/logger/Logger';
import { VoipServerConfigurationRaw } from '../../../app/models/server/raw/VoipServerConfiguration';
import { ServerType, IVoipServerConfig, isICallServerConfigData } from '../../../definition/IVoipServerConfig';
import { CommandHandler } from './connector/asterisk/CommandHandler';
import { CommandType } from './connector/asterisk/Command';
import { Commands } from './connector/asterisk/Commands';
import { IVoipConnectorResult } from '../../../definition/IVoipConnectorResult';
import { IQueueMembershipDetails, IRegistrationInfo, isIExtensionDetails } from '../../../definition/IVoipExtension';
import { IQueueDetails, IQueueSummary } from '../../../definition/ACDQueues';
import { settings } from '../../../app/settings/server';
import { IManagementServerConnectionStatus } from '../../../definition/IVoipServerConnectivityStatus';

export class VoipService extends ServiceClass implements IVoipService {
	protected name = 'voip';

	private logger: Logger;

	// this will hold the multiple call server connection settings that can be supported
	// They should only be modified through this service
	private VoipServerConfiguration: VoipServerConfigurationRaw;

	commandHandler: CommandHandler;

	constructor(db: Db) {
		super();

		this.logger = new Logger('voip service');
		// TODO: If we decide to move away from this approach after the MVP, don't forget do do a migration to remove the collection!
		this.VoipServerConfiguration = new VoipServerConfigurationRaw(db.collection('rocketchat_voip_server_configuration'));

		this.commandHandler = new CommandHandler(this);
		try {
			Promise.await(this.commandHandler.initConnection(CommandType.AMI));
		} catch (error) {
			this.logger.error({ mst: `Error while initialising the connector. error = ${error}` });
		}
	}

	private async initManagementServerConnection(): Promise<void> {
		this.logger.info({ msg: 'initialiseManagementServer() initialising the connector' });
		await this.commandHandler.initConnection(CommandType.AMI);
	}

	async addServerConfigData(config: Omit<IVoipServerConfig, '_id' | '_updatedAt'>): Promise<boolean> {
		const { type } = config;

		Promise.await(this.deactivateServerConfigDataIfAvailable(type));

		const existingConfig = await this.getServerConfigData(type);
		if (existingConfig) {
			throw new Error(`Error! There already exists an active record of type ${type}`);
		}

		const returnValue = !!(await this.VoipServerConfiguration.insertOne(config));
		if (returnValue && type === ServerType.MANAGEMENT) {
			// If we have added management server, initialise the connection to it.
			Promise.await(this.initManagementServerConnection());
		}
		return returnValue;
	}

	async updateServerConfigData(config: Omit<IVoipServerConfig, '_id' | '_updatedAt'>): Promise<boolean> {
		const { type } = config;

		Promise.await(this.deactivateServerConfigDataIfAvailable(type));

		const existingConfig = await this.getServerConfigData(type);
		if (!existingConfig) {
			throw new Error(`Error! No active record exists of type ${type}`);
		}

		await this.VoipServerConfiguration.updateOne({ type, active: true }, config);

		return true;
	}

	// in-future, if we want to keep a track of duration during which a server config was active, then we'd need to modify the
	// IVoipServerConfig interface and add columns like "valid_from_ts" and "valid_to_ts"
	async deactivateServerConfigDataIfAvailable(type: ServerType): Promise<boolean> {
		await this.VoipServerConfiguration.updateMany({ type, active: true }, { $set: { active: false } });
		return true;
	}

	async getServerConfigData(type: ServerType): Promise<IVoipServerConfig | null> {
		// TODO: Decide the approach we will take regarding settings after the MVP,
		// For now this work around should be enough.

		// const config = this.VoipServerConfiguration.findOne({ type, active: true });

		const management = type === ServerType.MANAGEMENT;
		return {
			type,
			host: settings.get(management ? 'VoIP_Management_Server_Host' : 'VoIP_Server_Host'),
			name: settings.get(management ? 'VoIP_Management_Server_Name' : 'VoIP_Server_Name'),
			active: true,
			...(management
				? {
						configData: {
							port: parseInt(settings.get('VoIP_Management_Server_Port')),
							username: settings.get('VoIP_Management_Server_Username'),
							password: settings.get('VoIP_Management_Server_Password'),
						},
				  }
				: {
						configData: {
							websocketPort: parseInt(settings.get('VoIP_Server_Websocket_Port')),
							websocketPath: settings.get('VoIP_Server_Websocket_Path'),
						},
				  }),
		};
	}

	// this is a dummy function to avoid having an empty IVoipService interface
	getConfiguration(): any {
		return {};
	}

	getConnector(): Promise<CommandHandler> {
		return Promise.resolve(this.commandHandler);
	}

	async getQueueSummary(): Promise<IVoipConnectorResult> {
		return this.commandHandler.executeCommand(Commands.queue_summary);
	}

	async getQueuedCallsForThisExtension(requestParams: { extension: string }): Promise<IVoipConnectorResult> {
		const membershipDetails: IQueueMembershipDetails = {
			queueCount: 0,
			callWaitingCount: 0,
			extension: '',
		};
		membershipDetails.extension = requestParams.extension;
		const queueSummary = Promise.await(this.commandHandler.executeCommand(Commands.queue_summary)) as IVoipConnectorResult;
		for (const queue of queueSummary.result as IQueueSummary[]) {
			const queueDetails = Promise.await(
				this.commandHandler.executeCommand(Commands.queue_details, { queueName: queue.name }),
			) as IVoipConnectorResult;
			this.logger.debug({ msg: 'API = voip/queues.getCallWaitingInQueuesForThisExtension queue details = ', result: queueDetails });
			if (!(queueDetails.result as unknown as IQueueDetails).members) {
				// Go to the next queue if queue does not have any
				// memmbers.
				continue;
			}
			const isAMember = (queueDetails.result as unknown as IQueueDetails).members.some((element) =>
				element.name.endsWith(requestParams.extension),
			);
			if (!isAMember) {
				// Current extension is not a member of queue in question.
				// continue with next queue.
				continue;
			}
			membershipDetails.callWaitingCount += Number((queueDetails.result as unknown as IQueueDetails).calls);
			membershipDetails.queueCount++;
		}
		const result: IVoipConnectorResult = {
			result: membershipDetails,
		};
		return Promise.resolve(result);
	}

	async getConnectorVersion(): Promise<string> {
		const version = this.commandHandler.getVersion();
		return Promise.resolve(version);
	}

	async getExtensionList(): Promise<IVoipConnectorResult> {
		return this.commandHandler.executeCommand(Commands.extension_list, undefined);
	}

	async getExtensionDetails(requestParams: { extension: string }): Promise<IVoipConnectorResult> {
		return this.commandHandler.executeCommand(Commands.extension_info, requestParams);
	}

	async getRegistrationInfo(requestParams: { extension: string }): Promise<{ result: IRegistrationInfo }> {
		const config = await this.getServerConfigData(ServerType.CALL_SERVER);

		if (!config) {
			this.logger.warn({ msg: 'API = connector.extension.getRegistrationInfo callserver settings not found' });
			throw new Error('Not found');
		}

		const endpointDetails = await this.commandHandler.executeCommand(Commands.extension_info, requestParams);
		if (!isIExtensionDetails(endpointDetails.result)) {
			// TODO The result and the assertion doenst match amol please check
			throw new Error('getRegistrationInfo Invalid endpointDetails response');
		}
		if (!isICallServerConfigData(config.configData)) {
			throw new Error('getRegistrationInfo Invalid configData response');
		}

		const callServerConfig = config.configData;

		const extensionDetails = endpointDetails.result;

		const extensionRegistrationInfo: IRegistrationInfo = {
			host: config.host,
			callServerConfig,
			extensionDetails,
		};
		return {
			result: extensionRegistrationInfo,
		};
	}

	async checkManagementConnection(
		host: string,
		port: string,
		userName: string,
		password: string,
	): Promise<IManagementServerConnectionStatus> {
		const connectionCheckCommandHandler = new CommandHandler(this);
		return connectionCheckCommandHandler.checkManagementConnection(host, port, userName, password);
	}

	async checkCallserverConnection(websocketUrl: string, protocol?: string): Promise<IManagementServerConnectionStatus> {
		const connectionCheckCommandHandler = new CommandHandler(this);
		return connectionCheckCommandHandler.checkCallserverConnection(websocketUrl, protocol);
	}
}
