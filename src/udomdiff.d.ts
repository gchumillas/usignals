declare module "udomdiff" {
  function udomdiff<T extends Node>(
    parentNode: Node,
    currentNodes: T[],
    newNodes: T[],
    getNode: (node: T) => Node,
    before?: Node | null,
  ): T[];

  export default udomdiff;
}
