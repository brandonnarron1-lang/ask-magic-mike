// Synchronous AST work never executes on the browser-interaction controller.
import {parentPort,workerData} from 'node:worker_threads';
import {mapScript} from './pr324-frozen-logpoints.mjs';
if(workerData.stall){
 if(process.env.AMM_COLLECTOR_SELFTEST!=='1')throw Error('synthetic_fault_only');
 parentPort.postMessage({phase:'cpu_stall_entered'});
 // Deliberately CPU-bound: only worker termination can stop this fault.
 while(true){}
}
const result=mapScript(workerData.source);
parentPort.postMessage({limitations:result.limitations,points:result.points.filter(p=>['flight_root_settled','queue_before_resolve'].includes(p.stage)).map(p=>({...p,startLocation:result.file.getLineAndCharacterOfPosition(p.start),endLocation:result.file.getLineAndCharacterOfPosition(p.end)}))});
