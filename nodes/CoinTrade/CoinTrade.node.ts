// import type { INodeTypeBaseDescription} from 'n8n-workflow';

import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { description } from './actions/description';
import { router } from './actions/router';
// import { listSearch, loadOptions, resourceMapping } from './methods';

export class CoinTrade implements INodeType {
	description: INodeTypeDescription = {
		...description
	};

	// constructor(baseDescription: INodeTypeBaseDescription) {
	// 	this.description = {
	// 		...baseDescription,
	// 		...description
	// 	};
	// }

	// methods = {
	// 	listSearch,
	// 	loadOptions,
	// 	resourceMapping,
	// };

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
