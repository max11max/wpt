// META: title=StorageManager: estimate() usage details for indexeddb
// META: script=../IndexedDB/support-promises.js
// META: script=helpers.js

promise_test(async t => {
  const estimate = await navigator.storage.estimate()
  assert_equals(typeof estimate.usageDetails, 'object');
}, 'estimate() resolves to dictionary with usageDetails member');

promise_test(async t => {
  await deleteAllDatabases(t);

  const arraySize = 1e6;
  const objectStoreName = "storageManager";
  const dbname = self.location.pathname;

  let estimate = await navigator.storage.estimate();
  const usageBeforeCreate = estimate.usage;
  const usageDetailsBeforeCreate = estimate.usageDetails;

  assert_equals(usageBeforeCreate, usageDetailsBeforeCreate.indexedDB,
    'usageDetails.indexedDB should match usage before object store is created');

  const db = await openDB(dbname, objectStoreName, t);

  estimate = await navigator.storage.estimate();
  const usageAfterCreate = estimate.usage;
  const usageDetailsAfterCreate = estimate.usageDetails;

  assert_equals(usageAfterCreate, usageDetailsAfterCreate.indexedDB,
    'usageDetails.indexedDB should match usage after object store is created.');
  assert_greater_than(
    usageAfterCreate, usageBeforeCreate,
    'estimated usage should increase after object store is created.');
  assert_true(
    objEqualsExceptForKeys(usageDetailsBeforeCreate, usageDetailsAfterCreate,
      ['indexedDB']),
    'after create, usageDetails object should remain ' +
    'unchanged aside from indexedDB usage.');

  const txn = db.transaction(objectStoreName, 'readwrite');
  const buffer = new ArrayBuffer(arraySize);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < arraySize; i++) {
    view[i] = Math.floor(Math.random() * 255);
  }

  const testBlob = new Blob([buffer], {
    type: "binary/random"
  });
  txn.objectStore(objectStoreName).add(testBlob, 1);

  await transactionPromise(txn);

  estimate = await navigator.storage.estimate();
  const usageAfterPut = estimate.usage;
  const usageDetailsAfterPut = estimate.usageDetails;

  assert_equals(usageAfterPut, usageDetailsAfterPut.indexedDB,
    'usageDetails should match usage after large value is stored');
  assert_greater_than(
    usageAfterPut, usageAfterCreate,
    'estimated usage should increase after large value is stored');
  assert_true(
    objEqualsExceptForKeys(usageDetailsAfterCreate, usageDetailsAfterPut,
      ['indexedDB']),
    'after put, usageDetails object should remain unchanged ' +
    'aside from indexedDB usage.');

  db.close();
}, 'estimate() usage details reflects increase after large value is stored');
