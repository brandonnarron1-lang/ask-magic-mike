// Loaded ONLY by the standalone local measurement worker's resolve hook.
if (process.env.AMM_SCALE_RUN !== '1' || !/^\d+$/.test(process.env.AMM_SCALE_PORT || ''))
    throw Error('isolated_reporting_worker_required');
export const transport = { query: async () => { throw Error('reporting_transport_not_configured'); } };
export const neon = () => transport;
