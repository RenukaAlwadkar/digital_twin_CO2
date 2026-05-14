export class Co2Agent {
  constructor() {
    this.thresholdCo2 = 1200; // ppm threshold for danger
  }

  analyze(nodes, cityKpi) {
    if (!nodes || nodes.length === 0) return null;

    // Detect high emission zones
    const criticalNodes = nodes.filter(n => n.co2ppm > this.thresholdCo2);
    
    if (criticalNodes.length > 0) {
      // Find the worst zone
      const worstNode = criticalNodes.reduce((prev, current) => (prev.co2ppm > current.co2ppm) ? prev : current);
      
      let recommendation = "";
      if (worstNode.type === 'traffic_monitoring') {
        recommendation = `High CO2 detected at ${worstNode.location}. Recommendation: Apply Traffic Reduction (30%) and deploy Carbon Capture Units.`;
      } else if (worstNode.zone === 'industrial') {
        recommendation = `Critical industrial emissions at ${worstNode.location}. Recommendation: Enforce Biofilter activation.`;
      } else {
        recommendation = `Elevated CO2 in ${worstNode.zone}. Recommendation: Increase Green Cover by 15%.`;
      }

      return {
        status: 'critical',
        worstNode: worstNode,
        recommendation: recommendation,
        actionParams: worstNode.type === 'traffic_monitoring' ? { trafficReduction: 30, captureCount: 15, captureEfficiency: 80 } : { greenCover: 15 }
      };
    }
    
    return {
      status: 'normal',
      recommendation: "Emissions are within normal bounds. Maintain current operations."
    };
  }
}

export const agentInstance = new Co2Agent();
