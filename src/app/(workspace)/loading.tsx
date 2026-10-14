export default function WorkspaceLoading() {
  return (
    <div className="module-loading" aria-label="Loading Foundry records" role="status">
      <div className="module-loading-heading"><span /><span /><span /></div>
      <div className="module-loading-metrics"><span /><span /><span /><span /></div>
      <div className="module-loading-table"><span />{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</div>
    </div>
  );
}
