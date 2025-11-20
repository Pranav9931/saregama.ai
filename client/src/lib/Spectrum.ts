export class Spectrum {
  private spectrumHeight = 255;
  private spectrumMaxExponent = 5;
  private spectrumMinExponent = 3;

  GetVisualBins(
    dataArray: Uint8Array,
    numElements: number,
    spectrumStart: number,
    spectrumEnd: number
  ): number[] {
    const samplePoints: number[] = [];
    let lastSpot = 0;

    for (let i = 0; i < numElements; i++) {
      let bin = Math.round(
        this.spectrumEase(i / numElements) * (spectrumEnd - spectrumStart) + spectrumStart
      );
      if (bin <= lastSpot) {
        bin = lastSpot + 1;
      }
      lastSpot = bin;
      samplePoints[i] = bin;
    }

    const maxSamplePoints: number[] = [];
    for (let i = 0; i < numElements; i++) {
      const curSpot = samplePoints[i];
      const nextSpot = samplePoints[i + 1] ?? spectrumEnd;

      let curMax = dataArray[curSpot];
      let maxSpot = curSpot;
      const dif = nextSpot - curSpot;

      for (let j = 1; j < dif; j++) {
        const newSpot = curSpot + j;
        if (dataArray[newSpot] > curMax) {
          curMax = dataArray[newSpot];
          maxSpot = newSpot;
        }
      }
      maxSamplePoints[i] = maxSpot;
    }

    const newArray: number[] = [];
    for (let i = 0; i < numElements; i++) {
      const nextMaxSpot = maxSamplePoints[i];
      const lastMaxSpot = maxSamplePoints[i - 1] ?? spectrumStart;
      const lastMax = dataArray[lastMaxSpot];
      const nextMax = dataArray[nextMaxSpot];

      newArray[i] = (lastMax + nextMax) / 2;
      if (isNaN(newArray[i])) {
        newArray[i] = 0;
      }
    }

    return this.exponentialTransform(newArray);
  }

  private exponentialTransform(array: number[]): number[] {
    const newArr: number[] = [];
    for (let i = 0; i < array.length; i++) {
      const exp =
        this.spectrumMaxExponent +
        (this.spectrumMinExponent - this.spectrumMaxExponent) * (i / array.length);
      newArr[i] = Math.max(Math.pow(array[i] / this.spectrumHeight, exp) * this.spectrumHeight, 1);
    }
    return newArr;
  }

  private spectrumEase(v: number): number {
    return Math.pow(v, 2.55);
  }
}
