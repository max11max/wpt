function objEqualsExceptForKeys(obj1, obj2, keys) {
  if (Object.keys(obj1).length !== Object.keys(obj2).length) {
    return false;
  }
  for (const key in obj1) {
    if (keys.includes(key)) {
      continue;
    }
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  return true;
}

function openDB(dbname, objectStoreName, t) {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(dbname);
    t.add_cleanup(() => {
      deleteDB(dbname, t);
    });

    openRequest.onerror = () => {
      reject(openRequest.error);
    };
    openRequest.onsuccess = () => {
      resolve(openRequest.result);
    };
    openRequest.onupgradeneeded = event => {
      openRequest.result.createObjectStore(objectStoreName);
    };
  });
}

async function deleteDB(name, testCase) {
  let request = indexedDB.deleteDatabase(name);
  let eventWatcher = requestWatcher(testCase, request);
  await eventWatcher.wait_for('success');
}

async function deleteAllDatabases(testCase) {
  const dbs_to_delete = await indexedDB.databases();
  for( const db_info of dbs_to_delete) {
    await deleteDB(db_info.name, testCase)
  }
}

function transactionPromise(txn) {
  return new Promise((resolve, reject) => {
    txn.onabort = () => {
      reject(txn.error);
    };
    txn.oncomplete = () => {
      resolve();
    };
  });
}
