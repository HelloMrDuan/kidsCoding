import {describe,expect,it} from 'vitest'
import {evaluateReleaseReadiness,releasePilotEvidence,releaseRequirements} from './release-readiness'

describe('lesson publication evidence gate is fail closed',()=>{
  it('requires all seven independent checks',()=>{
    expect(releaseRequirements).toHaveLength(7)
    expect(new Set(releaseRequirements.map(item=>item.key)).size).toBe(7)
    expect(evaluateReleaseReadiness({})).toMatchObject({ready:false})
    expect(evaluateReleaseReadiness({contentReviewed:true}).missing).toHaveLength(6)
  })
  it('every experimental Scratch/Python pilot stays blocked',()=>{
    expect(Object.keys(releasePilotEvidence)).toHaveLength(7)
    for(const evidence of Object.values(releasePilotEvidence)){
      const decision=evaluateReleaseReadiness(evidence)
      expect(decision.ready).toBe(false)
      expect(decision.missing.length).toBeGreaterThan(0)
    }
  })
  it('a hypothetical release is permitted only with every signal true',()=>{
    const hypothetical=Object.fromEntries(releaseRequirements.map(item=>[item.key,true]))
    expect(evaluateReleaseReadiness(hypothetical).ready).toBe(true)
    for(const key of releaseRequirements.map(item=>item.key)){
      expect(evaluateReleaseReadiness({...hypothetical,[key]:false}).ready).toBe(false)
    }
  })
})
