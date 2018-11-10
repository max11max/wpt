// META: script=support-promises.js

/**
 * This file contains the webplatform tests for the explicit commit() method
 * of the IndexedDB transaction API.
 *
 * @author andreasbutler@google.com
 */

promise_test(async testCase => {
  const db = await createDatabase(testCase, async db => {
    await createBooksStore(testCase, db);
  });
  const txn = db.transaction(['books'], 'readwrite');
  const objectStore = txn.objectStore('books');
  objectStore.put({isbn: 'one', title: 't1'});
  objectStore.put({isbn: 'two', title: 't2'});
  objectStore.put({isbn: 'three', title: 't3'});
  txn.commit();
  await promiseForTransaction(testCase, txn);

  const txn2 = db.transaction(['books'], 'readonly');
  const objectStore2 = txn2.objectStore('books');
  const getRequest1 = objectStore2.get('one');
  const getRequest2 = objectStore2.get('two');
  const getRequest3 = objectStore2.get('three');
  txn2.commit();
  await promiseForTransaction(testCase, txn2);
  assert_array_equals(
    [getRequest1.result.title,
        getRequest2.result.title,
        getRequest3.result.title],
    ['t1', 't2', 't3'],
    'Data put by an explicitly committed transaction should be gettable.');
  db.close();
}, 'Explicitly committed data can be read back out.');


promise_test(async testCase => {
  let db = await createNamedDatabase(testCase, 'versionDB', () => {});
  db.close();

  let dbInfo = await indexedDB.databases();
  assert_true(
      dbInfo.some(
          e => e.name === 'versionDB' && e.version === 1),
      'A newly created database should be version 1');

  // Upgrade the versionDB database and explicitly commit its versionchange
  // transaction.
  db = await migrateNamedDatabase(testCase, 'versionDB', 2, async (db, txn) => {
    txn.commit();
  });
  db.close();

  dbInfo = await indexedDB.databases();
  assert_true(
      dbInfo.some(
          e => e.name === 'versionDB' && e.version === 2),
      'A versionchange transaction should be explicitly commitable');
}, 'A versionchange transaction can be explicitly committed.');


promise_test(async testCase => {
  const db = await createDatabase(testCase, async db => {
    await createBooksStore(testCase, db);
  });
  const txn = db.transaction(['books'], 'readwrite');
  const objectStore = txn.objectStore('books');
  txn.commit();
  assert_throws('TransactionInactiveError',
      () => { objectStore.put({isbn: 'one', title: 't1'}); },
      'After commit is called, the transaction should be inactive.');
  db.close();
}, 'A committed transaction is blocked immediately.');


promise_test(async testCase => {
  const db = await createDatabase(testCase, async db => {
    await createBooksStore(testCase, db);
  });
  const txn = db.transaction(['books'], 'readwrite');
  const objectStore = txn.objectStore('books');
  const putRequest = objectStore.put({isbn: 'one', title: 't1'});
  putRequest.onsuccess = testCase.step_func(() => {
    assert_throws('TransactionInactiveError',
      () => { objectStore.put({isbn:'two', title:'t2'}); },
      'The transaction should not be active in the callback of a request after '
      + 'commit() is called.');
  });
  txn.commit();
  await promiseForTransaction(testCase, txn);
  db.close();
}, 'A committed transaction is blocked in future request callbacks.');


promise_test(async testCase => {
  const db = await createDatabase(testCase, async db => {
    await createBooksStore(testCase, db);
  });
  const txn = db.transaction(['books'], 'readwrite');
  const objectStore = txn.objectStore('books');
  txn.commit();

  assert_throws('TransactionInactiveError',
      () => { objectStore.put({isbn:'one', title:'t1'}); },
      'After commit is called, the transaction should be inactive.');

  const txn2 = db.transaction(['books'], 'readonly');
  const objectStore2 = txn2.objectStore('books');
  const getRequest = objectStore2.get('one');
  await promiseForTransaction(testCase, txn2);
  assert_equals(getRequest.result, undefined);

  db.close();
}, 'Puts issued after commit do not put anything.');


promise_test(async testCase => {
  const db = await createDatabase(testCase, async db => {
    await createBooksStore(testCase, db);
  });
  const txn = db.transaction(['books'], 'readwrite');
  const objectStore = txn.objectStore('books');
  txn.abort();
  assert_throws('InvalidStateError',
      () => { txn.commit(); },
      'The transaction should have been aborted.');
  db.close();
}, 'Calling commit on an aborted transaction throws.');


promise_test(async testCase => {
  const db = await createDatabase(testCase, async db => {
    await createBooksStore(testCase, db);
  });
  const txn = db.transaction(['books'], 'readwrite');
  const objectStore = txn.objectStore('books');
  txn.commit();
  assert_throws('InvalidStateError',
      () => { txn.commit(); },
      'The transaction should have already committed.');
  db.close();
}, 'Calling commit on a committed transaction throws.');


promise_test(async testCase => {
  const db = await createDatabase(testCase, async db => {
    await createBooksStore(testCase, db);
  });
  const txn = db.transaction(['books'], 'readwrite');
  const objectStore = txn.objectStore('books');
  const putRequest = objectStore.put({isbn:'one', title:'t1'});
  txn.commit();
  assert_throws('InvalidStateError',
      () => { txn.abort(); },
      'The transaction should already have committed.');
  const txn2 = db.transaction(['books'], 'readwrite');
  const objectStore2 = txn2.objectStore('books');
  const getRequest = objectStore2.get('one');
  await promiseForTransaction(testCase, txn2);
  assert_equals(
      getRequest.result.title,
      't1',
      'Expected the result to be retrievable');
  db.close();
}, 'Calling abort on a committed transaction throws and data is still '
   + 'committed.');


promise_test(async testCase => {
  const db = await createDatabase(testCase, async db => {
    await createBooksStore(testCase, db);
  });
  const txn = db.transaction(['books'], 'readwrite');
  const objectStore = txn.objectStore('books');
  const releaseTxnFunction = keep_alive(txn, 'books');

  // Break up the scope of execution to force the transaction into an inactive
  // state.
  await timeoutPromise(0);

  assert_throws('InvalidStateError',
      () => { txn.commit(); },
      'The transaction should be inactive so commit should be uncallable.');
  releaseTxnFunction();
  db.close();
}, 'Calling txn.commit() when txn is inactive should throw.');
