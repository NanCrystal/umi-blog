import request from '@/utils/request';

export async function getArtistList() {
  return request('/artists');
}

export async function getArtistDetail(id: number) {
  return request(`/artists/${id}`);
}

export async function createArtist(data: {
  name: string;
  artistId: string;
  avatar: string;
  bio?: string;
}) {
  return request('/artists', {
    method: 'POST',
    data,
  });
}

export async function updateArtist(
  id: number,
  data: {
    name?: string;
    artistId?: string;
    avatar?: string;
    bio?: string;
  },
) {
  return request(`/artists/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteArtist(id: number) {
  return request(`/artists/${id}`, {
    method: 'DELETE',
  });
}
