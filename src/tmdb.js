const API_KEY = '5c66fecac3410a4da2709f1d944be38c';
const BASE_URL = 'https://api.themoviedb.org/3';

// Busca de filmes e séries no TMDb
export async function searchTMDb(query) {
  try {
    const response = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Erro ao buscar no TMDb:', error);
    return [];
  }
}

// Busca os detalhes de uma série pelo ID
export async function getSeriesDetails(id) {
  try {
    console.log(`Buscando detalhes da série com ID: ${id}`);
    const response = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar detalhes da série: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Resposta da API para série:', data);
    return data;
  } catch (error) {
    console.error('Erro ao buscar detalhes da série:', error);
    return null;
  }
}

// Busca os detalhes de uma temporada de uma série pelo ID e número da temporada
export async function getSeasonDetails(seriesId, seasonNumber) {
  try {
    console.log(`Buscando detalhes da temporada ${seasonNumber} para série ID: ${seriesId}`);
    const response = await fetch(`${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar detalhes da temporada: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`Detalhes da temporada ${seasonNumber}:`, data);
    return data;
  } catch (error) {
    console.error('Erro ao buscar detalhes da temporada:', error);
    return null;
  }
}

