export const getItem = k => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(k, data => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(data);
      }
    });
  });
};
export const setItem = (k, v) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ k: v }, data => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(data);
      }
    });
  });
};
export const removeItem = k => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(k, data => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(data);
      }
    });
  });
};
export const clear = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(data => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(data);
      }
    });
  });
};
export const length = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.getBytesInUse(null, bytesInUse => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(bytesInUse);
      }
    });
  });
};
export const key = keyIndex => {
  return new Promise((resolve, reject) => {
    resolve({});
  });
};
