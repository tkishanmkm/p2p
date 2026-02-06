'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * Safely extracts the path from a Firestore Query or CollectionReference.
 * @param q The Firestore query or collection reference.
 * @returns The path string or undefined if it cannot be determined.
 */
function getQueryPath(q: any): string | undefined {
  if (!q) return undefined;
  if (q.type === 'collection' && typeof q.path === 'string') {
    return q.path;
  }
  // This is an internal, undocumented API, so we check defensively.
  if (q._query && q._query.path && typeof q._query.path.canonicalString === 'function') {
    return q._query.path.canonicalString();
  }
  return undefined;
}


/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const path = getQueryPath(memoizedTargetRefOrQuery);
    
    // A root collection query will have an empty path string.
    if (path === '') {
        const rootQueryError = new Error("Firestore root collection queries are not allowed. Please specify a collection path.");
        console.error("A component is attempting a root-level Firestore query, which is not permitted.", { query: memoizedTargetRefOrQuery });
        setError(rootQueryError);
        setData(null);
        setIsLoading(false);
        return; // Stop execution
    }

    setIsLoading(true);
    setError(null);

    // Directly use memoizedTargetRefOrQuery as it's assumed to be the final query
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (snapshotError: FirestoreError) => {
        const queryPath = getQueryPath(memoizedTargetRefOrQuery);

        // If for some reason we cannot determine the path, fall back to the original error.
        if (!queryPath) {
            setError(snapshotError);
            setData(null);
            setIsLoading(false);
            console.error("useCollection error (could not determine path for contextual error):", snapshotError);
            return;
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: queryPath,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // Re-run if the target query/reference changes.
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error };
}
