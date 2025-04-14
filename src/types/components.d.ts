declare module '@/components/PhotoPreview' {
  import { FC } from 'react'
  
  interface PhotoPreviewProps {
    url: string
    name: string
    uploaded_at: string
    onDelete: () => void
  }
  
  const PhotoPreview: FC<PhotoPreviewProps>
  export default PhotoPreview
}

declare module '@/components/Navbar' {
  import { FC } from 'react'
  
  const Navbar: FC
  export default Navbar
} 