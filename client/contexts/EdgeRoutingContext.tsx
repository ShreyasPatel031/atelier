/**
 * EdgeRoutingContext
 * 
 * Provides rawGraph and viewState to StepEdge components for mode detection.
 * This allows edges to determine whether to use ELK (LOCK) or libavoid (FREE) routing.
 * 
 * Routing is mode-based, not source-based. Diagrams are source-agnostic.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import type { RawGraph } from '../components/graph/types';
import type { ViewState } from '../core/viewstate/ViewState';

interface EdgeRoutingContextValue {
  rawGraph: RawGraph | null;
  viewState: ViewState | null;
}

const EdgeRoutingContext = createContext<EdgeRoutingContextValue>({
  rawGraph: null,
  viewState: null,
});

export const useEdgeRouting = () => useContext(EdgeRoutingContext);

interface EdgeRoutingProviderProps {
  children: ReactNode;
  rawGraph: RawGraph | null;
  viewState: ViewState | null;
}

export const EdgeRoutingProvider: React.FC<EdgeRoutingProviderProps> = ({
  children,
  rawGraph,
  viewState,
}) => {
  return (
    <EdgeRoutingContext.Provider value={{ rawGraph, viewState }}>
      {children}
    </EdgeRoutingContext.Provider>
  );
};

