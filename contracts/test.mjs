import fetch from 'node-fetch';
import fs from 'fs';

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}
function htmlify(limerick) {
  return limerick.trim().split('\n').map(line => `<p>${line}</p>`).join('');
}
const dirtyLimericks = fs.readFileSync('./dirty.txt', 'utf8').split('%');

async function beNasty() {
  const TELEGRAM_BOT = 'https://api.telegram.org/bot'
  const token = '5540672217:AAG-YwJYxEjaIGYm-vc-ynPZ4qYVh56CCxo';
  const channel = '-1001612256662';
  const message = htmlify(sample(dirtyLimericks));
  const qp = new URLSearchParams({ chat_id: channel, text: message });
  const response = await fetch(`${TELEGRAM_BOT}${token}/sendMessage?${qp}`);
  if (response.ok) {
    console.log('Message sent!');
  } else {
    console.log('Error sending message');
    console.log(`Status: ${response.status}`);
    console.log(await response.text());
  }
}

setInterval(beNasty, 10000 + Math.random() * 50000);
