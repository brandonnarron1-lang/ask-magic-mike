# Ask Magic Mike — Seven-Day Workbook Source

Use one row per day and formulas that exclude `Test? = Yes` from all commercial
totals. Required calculated fields: live leads, qualified, contacted,
appointments, signed clients, source mix, form mix, average assignment seconds,
average first-contact seconds, delivery failures, duplicate rate, unassigned
rate, SLA breaches, and test exclusions.

Suggested formulas:

- Live leads: `COUNTIFS(TestRange,"No",CreatedDateRange,DateCell)`
- Qualified rate: `IFERROR(QualifiedLive/LiveLeads,0)`
- Duplicate rate: `IFERROR(DuplicateLive/LiveLeads,0)`
- Unassigned rate: `IFERROR(UnassignedLive/LiveLeads,0)`
- Average assignment: `AVERAGEIFS(AssignmentSeconds,TestRange,"No")`
- Average first contact: `AVERAGEIFS(ContactSeconds,TestRange,"No")`

Do not enter future example results as actual performance.
