import { describe, it, expect } from 'vitest';
import { serverStore } from '../src/lib/serverStore';

describe('Team authentication & name resolution', () => {
  it('authenticates with exact team name and returns correct team name', async () => {
    // Hexaflux (ORION-S0006)
    const team = await serverStore.authenticateTeam('Hexaflux', 'z7dCgdYtTjwj');
    expect(team).not.toBeNull();
    expect(team?.registration_id).toBe('ORION-S0006');
    expect(team?.team_name).toBe('Hexaflux');
    expect(team?.leader_name).toBe('Sakthi lakshmi G');
  });

  it('authenticates with Deadline Dodgers (ORION-S0007)', async () => {
    const team = await serverStore.authenticateTeam('Deadline Dodgers', 'Kd8DE9Hs4e8G');
    expect(team).not.toBeNull();
    expect(team?.registration_id).toBe('ORION-S0007');
    expect(team?.team_name).toBe('Deadline Dodgers');
    expect(team?.leader_name).toBe('E Gogulnath');
  });

  it('authenticates with base name when team has a suffix like Codenova X', async () => {
    // Codenova X (ORION-S0008), user types 'Codenova'
    const team = await serverStore.authenticateTeam('Codenova', 'UPRnJYs5dsAC');
    expect(team).not.toBeNull();
    expect(team?.registration_id).toBe('ORION-S0008');
    expect(team?.team_name).toBe('Codenova X');
  });

  it('authenticates with username slug', async () => {
    const team = await serverStore.authenticateTeam('dual-core', 'XUJWf56neWFY');
    expect(team).not.toBeNull();
    expect(team?.registration_id).toBe('ORION-S0240');
    expect(team?.team_name).toBe('Dual Core');
  });

  it('authenticates with registration id', async () => {
    const team = await serverStore.authenticateTeam('ORION-S0240', 'XUJWf56neWFY');
    expect(team).not.toBeNull();
    expect(team?.registration_id).toBe('ORION-S0240');
    expect(team?.team_name).toBe('Dual Core');
  });

  it('rejects authentication with incorrect passcode', async () => {
    const team = await serverStore.authenticateTeam('Hexaflux', 'INCORRECT_PASSCODE');
    expect(team).toBeNull();
  });
});
