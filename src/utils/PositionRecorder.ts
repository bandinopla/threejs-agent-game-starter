import { Vector3, type Object3D } from "three";

const currentPos = new Vector3();
const lastPos = new Vector3();


/**
 * the idea is to travel the entire level following different paths and recording the positions
 * then we can use the recorded positions to create a path for the monkey
 * 
 * Press R to start recording and R again to stop and copy the path as JSON.
 * 
 */
export class PositionRecorder {
	readonly update:VoidFunction;


	constructor( target:Object3D, distanceThreshold:number = 0.1 )
	{
		let recordedPositions: Vector3[] = [];
		let isRecording = false;

		function handleKeyPress(event:KeyboardEvent) {
		    if (event.code === 'KeyR') { 
		        if (isRecording) {
		            // Stop recording and copy to clipboard
		            const positionsArray = recordedPositions.map(position => position.toArray().map(v=>Math.round(v*100)/100));
		            navigator.clipboard.writeText(JSON.stringify(positionsArray));
		            isRecording = false;
					alert("Copied")
		        } else {
		            // Start recording
		            isRecording = true;
		            //console.log('Recording started...');
		        }
		    }
		}

		this.update = ()=>{
			if( isRecording )
			{
				target.getWorldPosition(currentPos);
				if( currentPos.distanceTo(lastPos) > distanceThreshold )
				{
					recordedPositions.push(currentPos.clone());
					lastPos.copy(currentPos);
				}
			}
		}

		// Attach key press event listener
		window.addEventListener('keydown', handleKeyPress);
	} 

	parsePreRecordedPath( _path:Vector3[] )
	{

	}

}


export function pruneConsecutiveDuplicates(positions: [number, number, number][]): [number, number, number][] {
    if (positions.length <= 1) return positions; // If there's only one or no elements, return as is.

    let prunedPositions: [number, number, number][] = [];
    for (let i = 0; i < positions.length - 1; i++) {
        const currentPosition = positions[i];
        const nextPosition = positions[i + 1];

        // Check if the difference in any of the coordinates is less than 2 decimals
        if (
            Math.abs(currentPosition[0] - nextPosition[0]) < 0.02 &&
            Math.abs(currentPosition[1] - nextPosition[1]) < 0.02 &&
            Math.abs(currentPosition[2] - nextPosition[2]) < 0.02
        ) {
            continue; // Skip this element as it's a duplicate within the tolerance.
        }

        prunedPositions.push(currentPosition);
    }

    if (positions.length > 1) prunedPositions.push(positions[positions.length - 1]); // Add the last element if not already added.

    return prunedPositions.map( pos => [
		Math.round(pos[0]*100)/100,
		Math.round(pos[1]*100)/100,
		Math.round(pos[2]*100)/100,
	]);
}
