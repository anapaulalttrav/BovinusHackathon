// Testes rápidos do núcleo da simulação, executáveis com: node teste_simulador.js
// Não usa internet, navegador, bibliotecas externas ou API de IA.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/simulador.html','utf8');
const code = html.split('<script>').pop().split('</script>')[0];
const values = {
  visitors:600,shareGrill:65,shareScale:90,grillStaff:3,grillSeconds:51,
  scaleStaff:2,scaleSeconds:24,avgPlate:520,timeline:8,
  'arroz-grams':3000,'arroz-capacity':6000,'arroz-share':45,'arroz-min':900,
  'feijao-grams':2100,'feijao-capacity':5000,'feijao-share':28,'feijao-min':650,
  'salada-grams':2200,'salada-capacity':5000,'salada-share':30,'salada-min':600,
};
const elements = {};
const el = id => elements[id] ??= {
  value: values[id] ?? '', innerHTML:'',textContent:'',style:{},
  classList:{toggle(){},add(){},remove(){}},addEventListener(){},
};
const ctx = {
 document:{getElementById:el,querySelectorAll(){return []}},
 localStorage:{getItem(){return null},setItem(){}},
 console,setInterval(){},clearInterval(){},
};
vm.createContext(ctx);
vm.runInContext(code + '\n;globalThis.apiTest={simulate,setTime,renderAll,cubeSummary,cubesFromInput}',ctx);
const api=ctx.apiTest;
const data=api.simulate();
assert.equal(data.length,49,'49 pontos de 11h30 a 15h30');
assert.ok(Math.abs(data.reduce((a,x)=>a+x.clients,0)-600)<0.01,'600 clientes nos 48 blocos');
assert.equal(api.setTime(48),'15h30');
assert.equal(api.setTime(8),'12h10');
assert.ok(data[20].clients>data[1].clients,'horário de pico concentrado');
assert.ok(el('alerts').innerHTML.length>20,'alertas gerados');
assert.ok(el('cubeList').innerHTML.includes('Cuba 1'),'cubas geradas');
const before=data[20].scale.wait;
el('scaleStaff').value=3;
const after=api.simulate()[20].scale.wait;
assert.ok(after<before,'terceiro atendente reduz previsão de fila');
el('arroz-grams').value=100;
const risk=api.cubeSummary(api.cubesFromInput()[0],20);
assert.equal(risk.risk,'red','baixo nível gera alerta');
console.log('PASSOU: faixas, total, pico, capacidade, cubas, alertas.');
console.log('Exemplo ilustrativo às 13h10: espera balança com 2 vs. 3 operadores:',before.toFixed(2),'→',after.toFixed(2),'min.');
