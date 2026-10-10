// Every signal is false until there is positive, auditable evidence. Content != publication.
export const releaseRequirements = [
  { key:'contentReviewed', label:'详细教案和学习目标完成独立审阅' },
  { key:'engineProductionReady', label:'对应运行引擎在目标浏览器和真实设备完成验收' },
  { key:'assessmentE2EPassed', label:'多组正反测评和课程E2E均已验证' },
  { key:'licensedAssetsReady', label:'需要的插画音效配音均完成并清理授权' },
  { key:'progressVerified', label:'正式登录态的作品保存和跨设备进度已验证' },
  { key:'minorPrivacyApproved', label:'儿童隐私、输入和沙箱安全完成审核' },
  { key:'humanApproved', label:'负责人逐课批准正式发布' },
] as const

export type ReleaseRequirement = (typeof releaseRequirements)[number]['key']
export type ReleaseEvidence = Partial<Record<ReleaseRequirement, boolean>>

export function evaluateReleaseReadiness(evidence: ReleaseEvidence) {
  const missing = releaseRequirements.filter(item => evidence[item.key] !== true)
  return { ready: missing.length === 0, missing }
}

export const releasePilotEvidence: Record<string, ReleaseEvidence> = {
  'G3-U1-L02': {
    contentReviewed:false,
    engineProductionReady:false, // VM code executes but Scratch renderer and storage still missing.
    assessmentE2EPassed:false, // Prototype clone test is not a completed learner assignment.
    licensedAssetsReady:false, // AGPL/third-party review and production assets pending.
    progressVerified:false,
    minorPrivacyApproved:false,
    humanApproved:false,
  },
  'P0-U1-L01': {
    contentReviewed:false,engineProductionReady:false,assessmentE2EPassed:false,
    licensedAssetsReady:false,progressVerified:false,minorPrivacyApproved:false,humanApproved:false,
  },
  'P0-U1-L02': {
    contentReviewed:false,engineProductionReady:false,assessmentE2EPassed:false,
    licensedAssetsReady:false,progressVerified:false,minorPrivacyApproved:false,humanApproved:false,
  },
  'P0-U1-L03': {
    contentReviewed:false,engineProductionReady:false,assessmentE2EPassed:false,
    licensedAssetsReady:false,progressVerified:false,minorPrivacyApproved:false,humanApproved:false,
  },
}
