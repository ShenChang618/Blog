// 默认数组长度为 1024 * 1024 * 32
const size = document.querySelector('#size');
const calcCopy = document.querySelector('#calc-copy');
const calcTransferable = document.querySelector('#calc-transferable');
const timeWrappers = {
  copy: document.querySelector('#copy'),
  transferable: document.querySelector('#transferable'),
}

const worker = new Worker('./worker.js');
let start, name;

calcCopy.addEventListener('click', () => {
  start = +new Date();
  name = 'copy';
  console.log('计算拷贝时间中...');
  worker.postMessage(setArrayData(new Array(+size.value || 0)));
});

calcTransferable.addEventListener('click', () => {
  start = +new Date();
  name = 'transferable';
  console.log('计算转移时间中...');
  worker.postMessage(setArrayData(new ArrayBuffer(+size.value || 0)));
});

worker.addEventListener('message', e => {
  console.log('时间计算完毕');
  timeWrappers[name].textContent = e.data - start;
});

function setArrayData(array) {
  for (let i = 0; i < array.length; i++) {
    array[i] = i;
  }
  return array;
}