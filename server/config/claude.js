import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// claude-sonnet-5 defaults to extended thinking, which can consume the entire max_tokens
// budget on "thinking" before writing any visible text — leaving content with no text block
// at all (stop_reason: 'max_tokens'). Disable it by default for every call in this app, since
// none of our use cases (email drafting, document extraction, quotation comparison) need it;
// a caller can still override by passing its own `thinking` option.
const originalCreate = client.messages.create.bind(client.messages);
client.messages.create = (params, options) => {
    return originalCreate({ thinking: { type: 'disabled' }, ...params }, options);
};

export default client;
