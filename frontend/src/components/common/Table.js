import React from "react";
import "../styles/Table.css";

export default function Table({
  columns = [],
  data = [],
  onRowClick = null,
  loading = false,
  error = "",
  pagination = null,
}) {
  const colSpan = Math.max(columns.length, 1);

  return (
    <div className="tbl-wrap">
      <table className="tbl-main">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.label}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="tbl-state">Loading...</td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={colSpan} className="tbl-state tbl-state--error">{error}</td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="tbl-state">No data</td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "tbl-row-clickable" : ""}
              >
                {columns.map((col) => (
                  <td key={col.key || col.label}>
                    {typeof col.render === "function" ? col.render(row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination ? (
        <div className="tbl-pagination">
          <button
            type="button"
            disabled={pagination.offset <= 0 || loading}
            onClick={() => pagination.onPageChange(Math.max(0, pagination.offset - pagination.limit))}
          >
            Prev
          </button>
          <span>
            Page {Math.floor((pagination.offset || 0) / (pagination.limit || 1)) + 1}
          </span>
          <button
            type="button"
            disabled={loading || (pagination.hasNext === false) || (pagination.hasNext === undefined && data.length < pagination.limit)}
            onClick={() => pagination.onPageChange((pagination.offset || 0) + pagination.limit)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
