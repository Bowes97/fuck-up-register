import fetch from 'node-fetch';
import { Telegraf, Markup } from 'telegraf';
import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const blocks = [
    { id: '25306bd3-daf3-80ca-9ee7-df23fc3f903e', name: 'Кварік' },
    { id: '25306bd3-daf3-8024-9557-c180af561d70', name: 'Льоня' },
    { id: '25306bd3-daf3-80b1-951c-cf226c0406d3', name: 'Дуня' },
    { id: '25306bd3-daf3-80c3-a907-d42f1bc3cfa8', name: 'Мага' },
    { id: '25306bd3-daf3-8052-bfdc-cd4e0fb481b0', name: 'Стасян' },
    { id: '25306bd3-daf3-809d-a3a8-d55eddd721f0', name: 'Толік' },
    { id: '25306bd3-daf3-806f-8ea2-f59c2cc21e38', name: 'Ба' },
    { id: '25306bd3-daf3-801d-b26c-e64280be9b3a', name: 'Татусь' },
    { id: '25306bd3-daf3-807a-b22d-c54024f76599', name: 'Дід' },
    { id: '25306bd3-daf3-80d7-afba-fac174d37415', name: 'Юля' },
    { id: '25806bd3-daf3-80e1-9485-f3de2f1a0926', name: 'Соломія' },
    { id: '27b06bd3-daf3-803b-98a3-fab5f264a540', name: 'Марійка' },
];
const userSelection = new Map<string, string>();

class Bot {
    public startAdding(): void {
        bot.command('add', (ctx) => {
            const keyboard = blocks.map((b) => [Markup.button.callback(b.name, b.id)]);
            ctx.reply('Обери дрістолога', Markup.inlineKeyboard(keyboard));
        });
    }

    public handleSelection(): void {
        bot.on('callback_query', async (ctx: any) => {
            const blockId = ctx.callbackQuery.data;
            const userId = ctx.from?.id.toString();

            if (!userId) return;

            const selectedBlock = blocks.find((b) => b.id === blockId);
            const selectedName = selectedBlock ? selectedBlock.name : 'невідомий дрістолог';

            userSelection.set(userId, blockId);

            await ctx.answerCbQuery();
            await ctx.reply(`Впиши яку дрісню морознув - ${selectedName}`);
        });
    }

    public completedRequest(): void {
        bot.on('text', async (ctx) => {
            if (ctx.message.from.is_bot) return;
            const userId = ctx.from?.id.toString();
            if (!userId) return;

            const blockId = userSelection.get(userId);
            if (!blockId) return;

            const createdBy = ctx.from?.username ? ctx.from?.username : '';

            const text = ctx.message.text;
            await this.appendNumberedItem(blockId, text, createdBy);
            ctx.reply(`Пройоб успішно занотовано!`);

            userSelection.delete(userId);
        });
    }

    public launchBot(): void {
        bot.launch();
        bot.command('start', (ctx) => ctx.reply('Бот запущений через Webhook!'));
    }

    private async appendNumberedItem(blockId: string, text: string, createdBy: string): Promise<unknown> {
        const url = `https://api.notion.com/v1/blocks/${blockId}/children`;
        const body = {
            children: [
                {
                    object: 'block',
                    type: 'numbered_list_item',
                    numbered_list_item: {
                        rich_text: [{ type: 'text', text: { content: text + `(Добавив - ${createdBy})`} }],
                    },
                },
            ],
        };

        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return data;
    }
}


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bot.webhookCallback('/bot'));

app.listen(PORT, async () => {
    const WEBHOOK_URL = process.env.WEBHOOK_URL!;
    await bot.telegram.setWebhook(`${WEBHOOK_URL}/bot`);
    console.log(`Webhook set to ${WEBHOOK_URL}/bot`);
});

const startBot = new Bot();

startBot.startAdding();
startBot.completedRequest();
startBot.handleSelection()
startBot.launchBot();
