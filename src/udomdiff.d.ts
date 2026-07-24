// github.com/WebReflection/udomdiff
declare module "udomdiff" {
  function udomdiff<T extends Node>(
    parentNode: ParentNode, // where changes happen
    currentNodes: T[], // Array of current items/nodes
    futureNodes: T[], // Array of future items/nodes (returned)
    getNode: (node: T, toDoWhat?: number) => Node, // a callback to retrieve the node
    before?: Node | null, // the anchored node to insertBefore
  ): T[];

  export default udomdiff;
}
