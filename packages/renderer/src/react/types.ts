import { type ReactNode } from 'react';

import { type MarkContext, type NodeContext } from '../walk.js';

/**
 * What a node component receives. `children` is the node's already-rendered
 * content; `renderNode` and `combine` are there for a component that has to
 * group its children into wrappers the document does not contain.
 */
export type NodeRenderProps = NodeContext<ReactNode>;
export type MarkRenderProps = MarkContext<ReactNode>;

export type NodeRenderer = (props: NodeRenderProps) => ReactNode;
export type MarkRenderer = (props: MarkRenderProps) => ReactNode;
